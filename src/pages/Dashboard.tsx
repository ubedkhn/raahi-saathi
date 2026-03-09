import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Navigation, Clock, Search, Shield, MapPin } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { LocationInput, LocationData } from "@/components/common";
import NearbyRidesMap from "@/components/dashboard/NearbyRidesMap";
import { reverseGeocode } from "@/utils/geocoding";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: isAdmin } = useAdminStatus();
  const [nearbyRides, setNearbyRides] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [destination, setDestination] = useState<LocationData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkAuth();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          try {
            const addr = await reverseGeocode(loc.lat, loc.lng);
            setOriginAddress(addr);
          } catch { setOriginAddress("Current Location"); }
        },
        () => {}
      );
    }
  }, [navigate]);

  useEffect(() => {
    if (userLocation) loadNearbyRides();
  }, [userLocation]);

  const loadNearbyRides = async () => {
    if (!userLocation) return;
    try {
      const { data: rides } = await supabase
        .from("rides")
        .select("*, vehicles(*)")
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString());

      const filtered = (rides || []).filter(ride => {
        const R = 6371;
        const dLat = (Number(ride.origin_lat) - userLocation.lat) * Math.PI / 180;
        const dLon = (Number(ride.origin_lng) - userLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(userLocation.lat*Math.PI/180) * Math.cos(Number(ride.origin_lat)*Math.PI/180) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= 0.15;
      });
      setNearbyRides(filtered.slice(0, 5));
    } catch (e) { console.error(e); }
  };

  const handleSearch = () => {
    if (!destination) return;
    const params = new URLSearchParams();
    if (userLocation) {
      params.set("origin_lat", String(userLocation.lat));
      params.set("origin_lng", String(userLocation.lng));
      params.set("origin_address", originAddress);
    }
    params.set("dest_lat", String(destination.latitude));
    params.set("dest_lng", String(destination.longitude));
    params.set("dest_address", destination.address);
    navigate(`/search-rides?${params.toString()}`);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Welcome, {profile?.name}!</h2>
        <p className="text-sm text-muted-foreground">Where would you like to go today?</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3">
          {/* Origin (auto-filled) */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm truncate">{originAddress || "Detecting your location..."}</span>
          </div>

          {/* Destination input */}
          <LocationInput
            placeholder="Where are you going?"
            onLocationSelect={(loc) => setDestination(loc)}
            icon="destination"
          />

          <Button
            onClick={handleSearch}
            disabled={!destination}
            className="w-full min-h-[44px] font-semibold"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Rides
          </Button>
        </CardContent>
      </Card>

      {/* Nearby Rides */}
      {userLocation && (
        <div className="space-y-3 mb-6">
          <NearbyRidesMap userLocation={userLocation} nearbyRides={nearbyRides} />
          {nearbyRides.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Navigation className="w-3 h-3" /> {nearbyRides.length} ride(s) within 150m
              </p>
              <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory -mx-2 px-2">
                {nearbyRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="min-w-[260px] snap-start flex-shrink-0 p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-card"
                    onClick={() => navigate('/search-rides')}
                  >
                    <div className="font-medium text-sm truncate">{ride.origin_address}</div>
                    <div className="text-xs text-muted-foreground truncate">→ {ride.destination_address}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ride.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <Badge variant="outline" className="text-xs">₹{ride.price_per_km}/km</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {isAdmin && (
          <Card className="cursor-pointer active:shadow-md transition-shadow border-primary bg-gradient-to-r from-primary/10 to-primary/5" onClick={() => navigate('/admin')}>
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
      </div>
    </div>
  );
};

export default Dashboard;
