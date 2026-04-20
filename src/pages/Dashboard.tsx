import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Clock, Home, Briefcase, Star, AlertTriangle, X, Navigation2, CalendarPlus, ChevronRight, Shield, Car, Bike, Users, IndianRupee } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { LocationInput, LocationData } from "@/components/common";
import { reverseGeocode } from "@/utils/geocoding";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchModal from "@/components/search/SearchModal";

interface NearbyRide {
  id: string;
  origin_address: string;
  destination_address: string;
  start_time: string;
  seats_available: number;
  price_per_km: number;
  total_distance_km: number | null;
  status: string;
  driver_name: string;
  driver_avatar: string | null;
  driver_rating: number | null;
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_model: string;
  verified: boolean;
}

interface RecentDest {
  address: string;
  lat: number;
  lng: number;
}

const QUICK_FILTERS = ["College Routes", "Office Commute", "Weekend Trips"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [recentDests, setRecentDests] = useState<RecentDest[]>([]);
  const [saveAddressType, setSaveAddressType] = useState<"home" | "work" | null>(null);
  const [nearbyRides, setNearbyRides] = useState<NearbyRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      else {
        loadRecentDestinations(session.user.id);
        loadNearbyRides();
      }
    };
    checkAuth();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          try {
            const addr = await reverseGeocode(loc.lat, loc.lng);
            setOriginAddress(addr || "Current Location");
          } catch { setOriginAddress("Current Location"); }
        },
        () => {}
      );
    }
  }, [navigate]);

  const loadRecentDestinations = async (userId: string) => {
    const { data } = await supabase
      .from("bookings")
      .select("drop_address, drop_lat, drop_lng")
      .eq("rider_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3);
    if (data && data.length > 0) {
      setRecentDests(data.map((b) => ({ address: b.drop_address, lat: Number(b.drop_lat), lng: Number(b.drop_lng) })));
    }
  };

  const loadNearbyRides = async () => {
    setLoadingRides(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("rides")
        .select(`
          id, origin_address, destination_address, start_time, seats_available,
          price_per_km, total_distance_km, status, driver_id,
          profiles!rides_driver_id_fkey(name, avatar_url, kyc_status),
          vehicles(type, brand, model, verified)
        `)
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(10);

      if (error) throw error;

      // Fetch ratings for drivers
      const driverIds = [...new Set((data || []).map(r => r.driver_id))];
      let ratingsMap: Record<string, number> = {};
      if (driverIds.length > 0) {
        const { data: ratings } = await supabase
          .from("ratings")
          .select("reviewee_id, rating")
          .in("reviewee_id", driverIds);
        if (ratings) {
          const grouped: Record<string, number[]> = {};
          ratings.forEach(r => {
            if (!grouped[r.reviewee_id]) grouped[r.reviewee_id] = [];
            grouped[r.reviewee_id].push(r.rating);
          });
          Object.entries(grouped).forEach(([id, vals]) => {
            ratingsMap[id] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
          });
        }
      }

      const rides: NearbyRide[] = (data || [])
        .filter(r => r.driver_id !== user?.id)
        .map(r => ({
          id: r.id,
          origin_address: r.origin_address,
          destination_address: r.destination_address,
          start_time: r.start_time,
          seats_available: r.seats_available,
          price_per_km: r.price_per_km,
          total_distance_km: r.total_distance_km,
          status: r.status,
          driver_name: (r.profiles as any)?.name || "Driver",
          driver_avatar: (r.profiles as any)?.avatar_url || null,
          driver_rating: ratingsMap[r.driver_id] || null,
          vehicle_type: (r.vehicles as any)?.type || "4wheeler",
          vehicle_brand: (r.vehicles as any)?.brand || "",
          vehicle_model: (r.vehicles as any)?.model || "",
          verified: (r.profiles as any)?.kyc_status === "verified",
        }));

      setNearbyRides(rides);
    } catch (e) {
      console.error("Failed to load nearby rides:", e);
    } finally {
      setLoadingRides(false);
    }
  };

  const navigateToSearch = (dest: { address: string; lat: number; lng: number }) => {
    const params = new URLSearchParams();
    if (userLocation) {
      params.set("origin_lat", String(userLocation.lat));
      params.set("origin_lng", String(userLocation.lng));
      params.set("origin_address", originAddress);
    }
    params.set("dest_lat", String(dest.lat));
    params.set("dest_lng", String(dest.lng));
    params.set("dest_address", dest.address);
    navigate(`/search-rides?${params.toString()}`);
  };

  const navigateToRequest = (dest: { address: string; lat: number; lng: number }) => {
    const params = new URLSearchParams();
    if (userLocation) {
      params.set("origin_lat", String(userLocation.lat));
      params.set("origin_lng", String(userLocation.lng));
      params.set("origin_address", originAddress);
    }
    params.set("dest_lat", String(dest.lat));
    params.set("dest_lng", String(dest.lng));
    params.set("dest_address", dest.address);
    navigate(`/request-ride?${params.toString()}`);
  };

  const handleQuickDestClick = (type: "home" | "work") => {
    const addr = type === "home" ? profile?.home_address : profile?.work_address;
    const lat = type === "home" ? profile?.home_lat : profile?.work_lat;
    const lng = type === "home" ? profile?.home_lng : profile?.work_lng;
    if (addr && lat && lng) {
      navigateToSearch({ address: addr, lat: Number(lat), lng: Number(lng) });
    } else {
      setSaveAddressType(type);
    }
  };

  const handleSaveAddress = (location: LocationData) => {
    if (!saveAddressType) return;
    const updates = saveAddressType === "home"
      ? { home_address: location.address, home_lat: location.latitude, home_lng: location.longitude }
      : { work_address: location.address, work_lat: location.latitude, work_lng: location.longitude };
    updateProfile.mutate(updates);
    setSaveAddressType(null);
  };

  const handleBookRide = (rideId: string) => {
    navigate(`/search-rides?ride_id=${rideId}`);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + `, ${time}`;
  };

  const estimatedFare = (ride: NearbyRide) => {
    const dist = ride.total_distance_km || 0;
    return Math.round(dist * ride.price_per_km);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  const homeAddr = profile?.home_address;
  const workAddr = profile?.work_address;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Blue Header */}
      <div className="gradient-hero px-4 pt-4 pb-6 rounded-b-3xl shadow-md">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-primary-foreground italic">Raahi</h1>
        </div>
        {/* Search Bar */}
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card rounded-full shadow-md"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">Where to?</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Quick Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Quick Destinations Row */}
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors flex-1"
            onClick={() => handleQuickDestClick("home")}
          >
            <Home className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{homeAddr ? homeAddr.split(",")[0] : "Add Home"}</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors flex-1"
            onClick={() => handleQuickDestClick("work")}
          >
            <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{workAddr ? workAddr.split(",")[0] : "Add Work"}</span>
          </button>
        </div>

        {/* Nearby Rides Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Nearby Rides</h2>
            <button onClick={() => navigate("/search-rides")} className="text-sm text-primary font-medium flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {loadingRides ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : nearbyRides.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Car className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">No rides available nearby</p>
              <p className="text-xs text-muted-foreground mt-1">Post a ride request to find drivers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyRides.map((ride) => {
                const fare = estimatedFare(ride);
                const maxSeats = ride.vehicle_type === "2wheeler" ? 1 : 4;
                return (
                  <button
                    key={ride.id}
                    onClick={() => handleBookRide(ride.id)}
                    className="w-full bg-card rounded-xl border border-border p-4 text-left hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    {/* Driver Info Row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={ride.driver_avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {ride.driver_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {ride.verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-success rounded-full p-0.5">
                            <Shield className="h-3 w-3 text-success-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{ride.driver_name}'s Ride</span>
                          {ride.verified && (
                            <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">Identified</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {ride.driver_rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-secondary text-secondary" />
                              {ride.driver_rating}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            {ride.vehicle_type === "2wheeler" ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                            {ride.vehicle_brand} {ride.vehicle_model}
                          </span>
                        </div>
                      </div>
                      {/* Fav icon placeholder */}
                      <div className="flex-shrink-0">
                        {fare > 0 && (
                          <span className="text-lg font-bold text-foreground">₹{fare}</span>
                        )}
                      </div>
                    </div>

                    {/* Route */}
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="text-foreground font-medium">{ride.origin_address.split(",")[0]}</span>
                      {" → "}
                      <span className="text-foreground font-medium">{ride.destination_address.split(",")[0]}</span>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(ride.start_time)}
                        </span>
                        {fare > 0 && (
                          <span className="text-xs">₹{ride.price_per_km}/km</span>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${ride.seats_available <= 1 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                      >
                        {ride.vehicle_type === "2wheeler" ? <Bike className="h-3 w-3 mr-1" /> : <Car className="h-3 w-3 mr-1" />}
                        {ride.seats_available} seat{ride.seats_available !== 1 ? "s" : ""} left
                      </Badge>
                    </div>

                    {/* Savings badge */}
                    {fare > 100 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-success text-success-foreground text-[10px]">
                          Save ₹{Math.round(fare * 0.4)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">vs cab</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Places */}
        {recentDests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Places</h3>
            {recentDests.map((dest, index) => (
              <button
                key={index}
                onClick={() => navigateToSearch(dest)}
                className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border w-full text-left hover:border-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dest.address.split(",")[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{dest.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SOS Button */}
      <button
        onClick={() => navigate("/sos")}
        className="fixed bottom-20 right-4 z-40 bg-destructive text-destructive-foreground rounded-full p-3 shadow-lg hover:opacity-90 active:scale-95 transition-all"
        aria-label="Emergency SOS"
      >
        <AlertTriangle className="h-5 w-5" />
      </button>

      {/* New SearchModal — replaces legacy full-screen search + post-select dialog */}
      <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Save Address Dialog */}
      <Dialog open={!!saveAddressType} onOpenChange={() => setSaveAddressType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save {saveAddressType === "home" ? "Home" : "Work"} Address</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <LocationInput
              placeholder={`Search for your ${saveAddressType} address`}
              onLocationSelect={handleSaveAddress}
              icon="origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
