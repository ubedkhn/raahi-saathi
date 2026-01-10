import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, Shield, Search, AlertTriangle, Navigation, Clock, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useMyBookings, useMyRides } from "@/hooks/useRides";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: isAdmin } = useAdminStatus();
  const { data: bookings } = useMyBookings();
  const { data: myRides } = useMyRides();
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);

  useEffect(() => {
    // Check auth
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };
    checkAuth();

    // Get user location for nearby rides
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log("Location access denied:", error)
      );
    }
  }, [navigate]);

  // Fetch nearby rides when location is available
  useEffect(() => {
    if (userLocation) {
      loadNearbyRides();
    }
  }, [userLocation]);

  const loadNearbyRides = async () => {
    if (!userLocation) return;
    setLoadingNearby(true);

    try {
      const { data: rides, error } = await supabase
        .from("rides")
        .select("*, vehicles(*)")
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString());

      if (error) throw error;

      // Filter rides within 150m radius using Haversine formula
      const nearbyFiltered = (rides || []).filter(ride => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          Number(ride.origin_lat),
          Number(ride.origin_lng)
        );
        return distance <= 0.15; // 150 meters = 0.15 km
      });

      setNearbyRides(nearbyFiltered.slice(0, 5));
    } catch (error: any) {
      console.error("Error loading nearby rides:", error);
    } finally {
      setLoadingNearby(false);
    }
  };

  // Haversine formula to calculate distance between two coordinates in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter active bookings (not completed/cancelled)
  const activeBookings = bookings?.filter(b => 
    b.status !== 'completed' && b.status !== 'cancelled'
  ) || [];

  // Filter active rides
  const activeRides = myRides?.filter(r => 
    r.status === 'scheduled' || r.status === 'active'
  ) || [];

  if (profileLoading) {
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
          {profile?.kyc_status === 'verified' ? (
            <Badge variant="default">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          ) : profile?.kyc_status === 'pending' ? (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <Shield className="w-3 h-3 mr-1" />
              Verification Pending
            </Badge>
          ) : profile?.kyc_status === 'rejected' ? (
            <Badge variant="destructive">
              <Shield className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          ) : (
            <Badge variant="outline">
              <Shield className="w-3 h-3 mr-1" />
              Complete KYC
            </Badge>
          )}
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

          {/* Nearby Rides Section */}
          {userLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  Nearby Rides
                </CardTitle>
                <CardDescription>Rides starting within 150m of your location</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingNearby ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : nearbyRides.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Navigation className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No rides nearby right now</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {nearbyRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/search-rides')}>
                        <div className="flex-1">
                          <div className="font-medium">{ride.origin_address}</div>
                          <div className="text-sm text-muted-foreground">→ {ride.destination_address}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(ride.start_time).toLocaleString()}
                          </div>
                        </div>
                        <Badge>₹{ride.price_per_km}/km</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>View your upcoming rides</CardDescription>
            </CardHeader>
            <CardContent>
              {activeBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active bookings. Start searching for rides!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{booking.pickup_address}</div>
                        <div className="text-sm text-muted-foreground">→ {booking.drop_address}</div>
                      </div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                  {activeBookings.length > 3 && (
                    <Button variant="ghost" className="w-full" onClick={() => navigate('/recent-rides')}>
                      View All ({activeBookings.length})
                    </Button>
                  )}
                </div>
              )}
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
              {profile?.kyc_status === 'pending' && (
                <div className="text-center py-2">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Your KYC verification is in progress. You'll be notified once approved.
                  </p>
                </div>
              )}
              {profile?.kyc_status === 'rejected' && (
                <div className="text-center py-2">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-destructive" />
                  <p className="text-sm text-destructive mb-3">
                    Your KYC was rejected. Please resubmit your documents.
                  </p>
                </div>
              )}
              {(!profile?.kyc_status || profile?.kyc_status === null) && (
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
              {activeRides.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No rides posted yet. Create your first ride!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRides.slice(0, 3).map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{ride.origin_address}</div>
                        <div className="text-sm text-muted-foreground">→ {ride.destination_address}</div>
                      </div>
                      <Badge>{ride.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions - Simplified */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {isAdmin && (
          <Card 
            className="cursor-pointer active:shadow-md transition-shadow border-primary bg-gradient-to-r from-primary/10 to-primary/5" 
            onClick={() => navigate('/admin')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Admin Portal</h3>
                  <p className="text-sm text-muted-foreground">Manage platform</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer active:shadow-md transition-shadow" onClick={() => navigate('/sos')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <h3 className="font-semibold">SOS / Emergency</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="text-primary cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate('/emergency-contacts'); }}>
                    Add Emergency Contacts
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer active:shadow-md transition-shadow" onClick={() => navigate('/recent-rides')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Ride History</h3>
                <p className="text-sm text-muted-foreground">View past rides</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
