import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, Mail, MapPin, Bell, Check, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useUpdateProfile } from "@/hooks/useProfile";

type AuthStep = "email" | "verify-otp" | "complete-profile" | "permissions" | "reset-password";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState<AuthStep>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signupConfirmation, setSignupConfirmation] = useState(false);

  // OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Profile completion
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Permissions
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  // Resend timer
  const [resendTimer, setResendTimer] = useState(0);

  // Password reset
  const [resetData, setResetData] = useState({ password: "", confirmPassword: "" });
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Helper: check profile completeness with retry
  const checkProfileCompletion = async (userId: string, retryCount = 0): Promise<void> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", userId)
      .maybeSingle();

    if (!profile && retryCount < 2) {
      // Race condition with handle_new_user trigger — retry after 1s
      await new Promise((r) => setTimeout(r, 1000));
      return checkProfileCompletion(userId, retryCount + 1);
    }

    if (!profile || profile.name === "New User" || !profile.phone) {
      setStep("complete-profile");
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    const reset = searchParams.get("reset");
    if (reset === "true") {
      setStep("reset-password");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("reset-password");
      }
      if (event === "SIGNED_IN" && session) {
        await checkProfileCompletion(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && step === "email") {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams, navigate]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === "verify-otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const validateEmail = () => {
    const result = z.string().trim().email("Enter a valid email").safeParse(email);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return null;
    }
    return result.data;
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    const validEmail = validateEmail();
    if (!validEmail) return;

    if (authMode === "signup") {
      const pwSchema = z.string()
        .min(8, "Min 8 characters")
        .regex(/[A-Z]/, "Need uppercase")
        .regex(/[a-z]/, "Need lowercase")
        .regex(/[0-9]/, "Need number");
      const pwResult = pwSchema.safeParse(password);
      if (!pwResult.success) {
        setPasswordError(pwResult.error.errors[0].message);
        return;
      }
    } else if (!password) {
      setPasswordError("Enter your password");
      return;
    }

    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: validEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          // Auto-confirmed - SIGNED_IN handler takes over
        } else {
          setSignupConfirmation(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: validEmail,
          password,
        });
        if (error) throw error;
        // SIGNED_IN handler takes over
      }
    } catch (error: any) {
      const msg = error?.message || "Authentication failed";
      if (msg.toLowerCase().includes("invalid login")) {
        setPasswordError("Incorrect email or password");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setEmailError("Email already registered. Try signing in.");
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    setEmailError("");
    const validEmail = validateEmail();
    if (!validEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: validEmail });
      if (error) throw error;
      setStep("verify-otp");
      setResendTimer(30);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast({ title: "Incomplete OTP", description: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      // SIGNED_IN event will handle the rest via onAuthStateChange
    } catch (error: any) {
      toast({ title: "Invalid OTP", description: error.message || "Please check the code and try again", variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      toast({ title: "OTP sent!", description: "Check your email inbox." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    const errors: Record<string, string> = {};
    if (!profileName.trim() || profileName.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!profilePhone.trim().match(/^\+91[0-9]{10}$/)) errors.phone = "Enter phone as +91XXXXXXXXXX";
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }
    setLoading(true);
    try {
      await updateProfile.mutateAsync({ name: profileName.trim(), phone: profilePhone.trim() });
      setStep("permissions");
    } catch {
      // error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = async () => {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      setLocationGranted(true);
    } catch {
      toast({ title: "Location denied", description: "You can enable it later in settings." });
    }
  };

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotifGranted(permission === "granted");
      if (permission !== "granted") {
        toast({ title: "Notifications blocked", description: "Enable them in browser settings." });
      }
    } catch {
      toast({ title: "Not supported", description: "Push notifications aren't available." });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        throw result.error;
      }
    } catch (error: any) {
      const msg = error?.message || "Unable to sign in with Google. Please try again.";
      toast({ title: "Google Sign-In Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    const result = z.string().trim().email("Enter a valid email").safeParse(email);
    if (!result.success) { setEmailError(result.error.errors[0].message); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(result.data, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast({ title: "Reset link sent!", description: "Check your inbox." });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrors({});
    const schema = z.object({
      password: z.string().min(8, "Min 8 characters").regex(/[A-Z]/, "Need uppercase").regex(/[a-z]/, "Need lowercase").regex(/[0-9]/, "Need number").regex(/[^A-Za-z0-9]/, "Need special char"),
      confirmPassword: z.string(),
    }).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

    const result = schema.safeParse(resetData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0].toString()] = err.message; });
      setResetErrors(errors);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: result.data.password });
      if (error) throw error;
      toast({ title: "Password updated!", description: "You can now sign in." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Reset password view
  if (step === "reset-password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-6 px-6 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-1">Raahi</h1>
              <p className="text-muted-foreground text-sm">Set your new password</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input type={showResetPassword ? "text" : "password"} value={resetData.password}
                    onChange={(e) => { setResetData({ ...resetData, password: e.target.value }); setResetErrors({}); }}
                    className={`min-h-[44px] pr-10 ${resetErrors.password ? "border-destructive" : ""}`}
                    placeholder="Min. 8 chars with upper, lower, number & symbol" />
                  <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetErrors.password && <p className="text-sm text-destructive">{resetErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input type={showResetConfirmPassword ? "text" : "password"} value={resetData.confirmPassword}
                    onChange={(e) => { setResetData({ ...resetData, confirmPassword: e.target.value }); setResetErrors({}); }}
                    className={`min-h-[44px] pr-10 ${resetErrors.confirmPassword ? "border-destructive" : ""}`}
                    placeholder="Confirm your new password" />
                  <button type="button" onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetErrors.confirmPassword && <p className="text-sm text-destructive">{resetErrors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Step: Email Entry */}
          {step === "email" && !showForgotPassword && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-primary">Raahi</h1>
                <p className="text-muted-foreground">India's peer-to-peer ride sharing</p>
              </div>

              {/* Sign in / Sign up tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setPasswordError(""); }}
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${authMode === "signin" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setPasswordError(""); }}
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${authMode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handlePasswordAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    className={`min-h-[48px] text-base ${emailError ? "border-destructive" : ""}`}
                    autoFocus
                    autoComplete="email"
                  />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={authMode === "signup" ? "Min 8 chars, upper, lower, number" : "Enter your password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                      className={`min-h-[48px] text-base pr-10 ${passwordError ? "border-destructive" : ""}`}
                      autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                  {authMode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <Button type="submit" className="w-full min-h-[48px] text-base font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="w-full min-h-[48px] text-base" onClick={handleGoogleSignIn} disabled={loading}>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Button>
                <Button variant="ghost" className="w-full min-h-[44px] text-sm" onClick={handleSendMagicLink} disabled={loading}>
                  <Mail className="mr-2 h-4 w-4" /> Email me a magic link instead
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our{" "}
                <a href="/terms" className="underline text-primary">Terms of Service</a>
              </p>
            </div>
          )}

          {/* Forgot password */}
          {step === "email" && showForgotPassword && (
            <div className="space-y-6">
              <button type="button" onClick={() => setShowForgotPassword(false)} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </button>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">We'll send you a reset link</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  className={`min-h-[48px] ${emailError ? "border-destructive" : ""}`} />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </div>
          )}

          {/* Signup confirmation pending */}
          {step === "email" && signupConfirmation && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Confirm your email</h2>
                <p className="text-muted-foreground">
                  We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to activate your account, then return here to sign in.
                </p>
              </div>
              <Button variant="outline" className="w-full min-h-[44px]" onClick={() => { setSignupConfirmation(false); setAuthMode("signin"); setPassword(""); }}>
                Back to sign in
              </Button>
            </div>
          )}

          {/* Step: Check Email (Magic Link) */}
          {step === "verify-otp" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-muted-foreground">
                  We sent a login link to <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the link in your email to sign in. This page will update automatically.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">Waiting for sign-in...</span>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="w-full min-h-[44px]" onClick={handleResend} disabled={resendTimer > 0 || loading}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Link"}
                </Button>
                <button type="button" onClick={() => { setStep("email"); }}
                  className="text-sm text-muted-foreground hover:text-foreground">
                  ← Use a different email
                </button>
              </div>
            </div>
          )}

          {/* Step: Complete Profile */}
          {step === "complete-profile" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Complete your profile</h2>
                <p className="text-sm text-muted-foreground">Just a few details to get started</p>
              </div>
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Full Name</Label>
                  <Input
                    placeholder="Your Name"
                    value={profileName}
                    onChange={(e) => { setProfileName(e.target.value); setProfileErrors({}); }}
                    className={`min-h-[48px] text-base ${profileErrors.name ? "border-destructive" : ""}`}
                    autoFocus
                  />
                  {profileErrors.name && <p className="text-sm text-destructive">{profileErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Phone Number</Label>
                  <Input
                    placeholder="+919876543210"
                    value={profilePhone}
                    onChange={(e) => { setProfilePhone(e.target.value); setProfileErrors({}); }}
                    className={`min-h-[48px] text-base ${profileErrors.phone ? "border-destructive" : ""}`}
                  />
                  {profileErrors.phone && <p className="text-sm text-destructive">{profileErrors.phone}</p>}
                </div>
                <Button type="submit" className="w-full min-h-[48px] text-base font-semibold" disabled={loading}>
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </form>
            </div>
          )}

          {/* Step: Permissions */}
          {step === "permissions" && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Enable permissions</h2>
                <p className="text-sm text-muted-foreground">For the best experience</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={requestLocation}
                  className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Location Access</p>
                    <p className="text-sm text-muted-foreground">Find rides near you</p>
                  </div>
                  {locationGranted ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                <button
                  onClick={requestNotifications}
                  className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Get ride updates instantly</p>
                  </div>
                  {notifGranted ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>

              <Button className="w-full min-h-[48px] text-base font-semibold" onClick={() => navigate("/dashboard")}>
                {locationGranted || notifGranted ? "Continue" : "Skip for now"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
