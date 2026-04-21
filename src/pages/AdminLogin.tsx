import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error("No user data");

      // Server-side admin verification via SECURITY DEFINER function.
      // Avoids trusting any client-side role list.
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: authData.user.id,
        _role: 'admin',
      });

      if (roleError) throw roleError;

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Access Denied", {
          description: "You don't have admin privileges.",
        });
        return;
      }

      toast.success("Welcome Admin!", {
        description: "Successfully logged in.",
      });
      navigate("/admin");
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error("Login Failed", {
        description: error.message || "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 animate-fade-in">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>
            Sign in with your administrator credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@raahi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
