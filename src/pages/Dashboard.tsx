import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Car, MapPin, Plus, Shield, LogOut, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Raahi</h1>
          <div className="flex items-center gap-4">
            <Badge variant={profile?.kyc_status === 'verified' ? 'default' : 'secondary'}>
              <Shield className="w-3 h-3 mr-1" />
              {profile?.kyc_status || 'pending'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile?.name}!</h2>
          <p className="text-muted-foreground">What would you like to do today?</p>
        </div>

        <Tabs defaultValue="find" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="find">
              <MapPin className="w-4 h-4 mr-2" />
              Find a Ride
            </TabsTrigger>
            <TabsTrigger value="offer">
              <Car className="w-4 h-4 mr-2" />
              Offer a Ride
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search for Rides</CardTitle>
                <CardDescription>
                  Find rides going your way and travel together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate('/search-rides')}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Search Available Rides
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Bookings</CardTitle>
                <CardDescription>View your upcoming and past rides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings yet. Start searching for rides!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Post a Ride</CardTitle>
                <CardDescription>
                  Share your journey and earn money
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.kyc_status === 'verified' ? (
                  <Button className="w-full" onClick={() => navigate('/post-ride')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Ride
                  </Button>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Complete KYC verification to offer rides
                    </p>
                    <Button onClick={() => navigate('/profile')}>
                      Complete Verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rides</CardTitle>
                <CardDescription>Manage your posted rides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No rides posted yet. Create your first ride!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/profile')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Profile</h3>
                  <p className="text-sm text-muted-foreground">Manage your account</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vehicles')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Car className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Vehicles</h3>
                  <p className="text-sm text-muted-foreground">Add your vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/safety')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Safety</h3>
                  <p className="text-sm text-muted-foreground">Emergency contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
