import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  password: z.string()
    .min(1, 'Password is required')
});

const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .trim()
    .regex(/^\+91[0-9]{10}$/, 'Phone must be +91 followed by exactly 10 digits (e.g., +919876543210)'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  
  const [signupData, setSignupData] = useState({ 
    name: "", 
    phone: "", 
    email: "", 
    password: "" 
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    // Validate input
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setLoginErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const validated = result.data;
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    
    // Validate input
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setSignupErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const validated = result.data;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (authError) {
        toast({
          title: "Signup failed",
          description: authError.message.includes('already registered') 
            ? "This email is already registered. Please login instead."
            : "Unable to create account. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (!authData.user) throw new Error("No user data returned");

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            name: validated.name,
            phone: validated.phone,
          }
        ]);

      if (profileError) {
        toast({
          title: "Signup failed",
          description: "Unable to create profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account created!",
        description: "Welcome to Raahi. Complete your profile to start riding.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-white hover:bg-white/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="shadow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Raahi</CardTitle>
            <CardDescription>Join India's peer-to-peer ride sharing community</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={(e) => {
                        setLoginData({ ...loginData, email: e.target.value });
                        if (loginErrors.email) {
                          setLoginErrors({ ...loginErrors, email: "" });
                        }
                      }}
                      className={loginErrors.email ? "border-destructive" : ""}
                    />
                    {loginErrors.email && (
                      <p className="text-sm text-destructive">{loginErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={loginData.password}
                      onChange={(e) => {
                        setLoginData({ ...loginData, password: e.target.value });
                        if (loginErrors.password) {
                          setLoginErrors({ ...loginErrors, password: "" });
                        }
                      }}
                      className={loginErrors.password ? "border-destructive" : ""}
                    />
                    {loginErrors.password && (
                      <p className="text-sm text-destructive">{loginErrors.password}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupData.name}
                      onChange={(e) => {
                        setSignupData({ ...signupData, name: e.target.value });
                        if (signupErrors.name) {
                          setSignupErrors({ ...signupErrors, name: "" });
                        }
                      }}
                      className={signupErrors.name ? "border-destructive" : ""}
                    />
                    {signupErrors.name && (
                      <p className="text-sm text-destructive">{signupErrors.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+919876543210"
                      value={signupData.phone}
                      onChange={(e) => {
                        setSignupData({ ...signupData, phone: e.target.value });
                        if (signupErrors.phone) {
                          setSignupErrors({ ...signupErrors, phone: "" });
                        }
                      }}
                      className={signupErrors.phone ? "border-destructive" : ""}
                    />
                    {signupErrors.phone && (
                      <p className="text-sm text-destructive">{signupErrors.phone}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupData.email}
                      onChange={(e) => {
                        setSignupData({ ...signupData, email: e.target.value });
                        if (signupErrors.email) {
                          setSignupErrors({ ...signupErrors, email: "" });
                        }
                      }}
                      className={signupErrors.email ? "border-destructive" : ""}
                    />
                    {signupErrors.email && (
                      <p className="text-sm text-destructive">{signupErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 8 chars with upper, lower, number & symbol"
                      value={signupData.password}
                      onChange={(e) => {
                        setSignupData({ ...signupData, password: e.target.value });
                        if (signupErrors.password) {
                          setSignupErrors({ ...signupErrors, password: "" });
                        }
                      }}
                      className={signupErrors.password ? "border-destructive" : ""}
                    />
                    {signupErrors.password && (
                      <p className="text-sm text-destructive">{signupErrors.password}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
