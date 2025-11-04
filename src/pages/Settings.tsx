import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Key, HelpCircle, Mail, Info, Shield } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to contact us");
        return;
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        issue_type: "general",
        description: `Name: ${contactData.name}\nEmail: ${contactData.email}\n\nMessage:\n${contactData.message}`,
        status: "open",
      });

      if (error) throw error;

      toast.success("Message sent successfully", {
        description: "We'll get back to you soon!",
      });
      setContactData({ name: "", email: "", message: "" });
    } catch (error: any) {
      console.error("Contact error:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 animate-fade-in pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="password" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Change Password */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input
                      id="current"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">New Password</Label>
                    <Input
                      id="new"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help */}
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Help & FAQs
                </CardTitle>
                <CardDescription>
                  Find answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">How do I verify my KYC?</h3>
                    <p className="text-sm text-muted-foreground">
                      Go to your Profile, click Edit, and complete the KYC verification section with your Aadhaar and Driving License details.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">How do I offer a ride?</h3>
                    <p className="text-sm text-muted-foreground">
                      From the Dashboard, go to the "Offer a Ride" tab. Your KYC must be verified to offer rides.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">How do bookings work?</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for rides, select one that matches your route, and click "Book Now". The driver will be notified and can accept your request.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">How do I cancel a booking?</h3>
                    <p className="text-sm text-muted-foreground">
                      Go to your Profile, find the booking under "My Bookings", and click Cancel. Note that cancellation policies may apply.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Is my data safe?</h3>
                    <p className="text-sm text-muted-foreground">
                      Yes! We use industry-standard encryption and security measures to protect your personal information and KYC documents.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Us */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Us
                </CardTitle>
                <CardDescription>
                  Send us a message and we'll get back to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      value={contactData.name}
                      onChange={(e) =>
                        setContactData({ ...contactData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactData.email}
                      onChange={(e) =>
                        setContactData({ ...contactData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      rows={5}
                      value={contactData.message}
                      onChange={(e) =>
                        setContactData({ ...contactData, message: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About */}
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  About Raahi
                </CardTitle>
                <CardDescription>
                  Learn more about our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Our Mission</h3>
                  <p className="text-sm text-muted-foreground">
                    Raahi is dedicated to making transportation more accessible, affordable, and sustainable through ride-sharing. We connect drivers and riders going the same way, reducing costs and environmental impact.
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Version</h3>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Terms & Privacy</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    By using Raahi, you agree to our terms of service and privacy policy.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Terms of Service</Button>
                    <Button variant="outline" size="sm">Privacy Policy</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your safety is our priority. All users undergo KYC verification, and we use advanced security measures to protect your data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
