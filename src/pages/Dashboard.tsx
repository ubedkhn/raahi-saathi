import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Car, MapPin, Shield, Search } from "lucide-react";
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-3xl font-bold">Welcome, {profile?.name}!</h2>
          <Badge variant={profile?.kyc_status === 'verified' ? 'default' : 'secondary'}>
            <Shield className="w-3 h-3 mr-1" />
            {profile?.kyc_status || 'pending'}
          </Badge>
        </div>
        <p className="text-muted-foreground">Where would you like to go today?</p>
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
            <CardContent className="space-y-4">
              <Button
                size="lg"
                variant="find-ride"
                onClick={() => navigate('/search-rides')}
                className="w-full font-semibold"
              >
                <Search className="mr-2 h-5 w-5" />
                Find a Ride
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>View your upcoming rides</CardDescription>
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
            <CardContent className="space-y-4">
              <Button
                size="lg"
                variant="offer-ride"
                onClick={() => navigate('/post-ride')}
                className="w-full font-semibold"
              >
                <Car className="mr-2 h-5 w-5" />
                Offer a Ride
              </Button>
              {profile?.kyc_status !== 'verified' && (
                <div className="text-center py-2">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Complete KYC verification to start offering rides
                  </p>
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
        <Card className="cursor-pointer active:shadow-md transition-shadow" onClick={() => navigate('/profile')}>
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

        <Card className="cursor-pointer active:shadow-md transition-shadow" onClick={() => navigate('/vehicles')}>
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

        <Card className="cursor-pointer active:shadow-md transition-shadow" onClick={() => navigate('/sos')}>
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
  );
};

export default Dashboard;
