import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Clock, Home, Briefcase, Star } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { LocationInput, LocationData } from "@/components/common";
import { reverseGeocode } from "@/utils/geocoding";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  const handleLocationSelect = (location: LocationData) => {
    const params = new URLSearchParams();
    if (userLocation) {
      params.set("origin_lat", String(userLocation.lat));
      params.set("origin_lng", String(userLocation.lng));
      params.set("origin_address", originAddress);
    }
    params.set("dest_lat", String(location.latitude));
    params.set("dest_lng", String(location.longitude));
    params.set("dest_address", location.address);
    navigate(`/search-rides?${params.toString()}`);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  // Quick destination suggestions (placeholders for saved places)
  const quickDestinations = [
    { icon: Home, label: "Home", sublabel: "Add home" },
    { icon: Briefcase, label: "Work", sublabel: "Add work" },
    { icon: Star, label: "Saved", sublabel: "View all" },
  ];

  return (
    <div className="min-h-screen bg-accent/30 flex flex-col">
      {/* Header with Search Bar */}
      <div className="bg-card px-4 pt-2 pb-4 shadow-sm">
        {/* Search Bar Trigger */}
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-background rounded-full border border-border shadow-sm hover:shadow-md transition-shadow"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="text-foreground font-medium">Where are you going?</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6">
        {/* Current Location Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground truncate">
            {originAddress || "Detecting location..."}
          </span>
        </div>

        {/* Quick Destinations */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {quickDestinations.map((dest, index) => (
            <button
              key={index}
              className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
              onClick={() => setShowSearch(true)}
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2">
                <dest.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{dest.label}</span>
              <span className="text-xs text-muted-foreground">{dest.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Recent Places Skeleton */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Places</h3>
          {[1, 2, 3].map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
            >
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="h-3 w-32 bg-muted rounded animate-pulse mb-1" />
                <div className="h-2 w-48 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Illustration Section */}
      <div className="px-4 pb-24">
        <div className="relative bg-gradient-to-br from-accent/50 to-primary/5 rounded-2xl p-6 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-primary italic mb-2">#goRaahi</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>🇮🇳</span>
              <span>Made for India</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>❤️</span>
              <span>Peer-to-peer rides</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(false)}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              >
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="flex-1">
                <LocationInput
                  placeholder="Where are you going?"
                  onLocationSelect={handleLocationSelect}
                  icon="destination"
                  className="border-0 shadow-none"
                />
              </div>
            </div>
            
            {/* Origin display */}
            <div className="flex items-center gap-3 mt-3 px-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground truncate">
                From: {originAddress || "Current location"}
              </span>
            </div>
          </div>

          {/* Search suggestions area */}
          <div className="flex-1 p-4">
            <p className="text-sm text-muted-foreground text-center mt-8">
              Start typing to search for destinations
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
