import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Clock, Home, Briefcase, Star, AlertTriangle, X, Navigation2, CalendarPlus } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { LocationInput, LocationData } from "@/components/common";
import { reverseGeocode } from "@/utils/geocoding";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DashboardMap from "@/components/dashboard/DashboardMap";

interface RecentDest {
  address: string;
  lat: number;
  lng: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [recentDests, setRecentDests] = useState<RecentDest[]>([]);
  const [saveAddressType, setSaveAddressType] = useState<"home" | "work" | null>(null);
  const [selectedDest, setSelectedDest] = useState<LocationData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      else loadRecentDestinations(session.user.id);
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

  const handleLocationSelect = (location: LocationData) => {
    setSelectedDest(location);
    setShowSearch(false);
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
    <div className="min-h-screen bg-accent/30 flex flex-col">
      {/* Header with Search Bar */}
      <div className="bg-card px-4 pt-2 pb-4 shadow-sm">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-background rounded-full border border-border shadow-sm hover:shadow-md transition-shadow"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="text-foreground font-medium">Where are you going?</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Map */}
        {userLocation && (
          <DashboardMap userLocation={userLocation} />
        )}

        {/* Current Location */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground truncate">
            {originAddress || "Detecting location..."}
          </span>
        </div>

        {/* Quick Destinations */}
        <div className="grid grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
            onClick={() => handleQuickDestClick("home")}
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Home</span>
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {homeAddr ? homeAddr.split(",")[0] : "Add home"}
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
            onClick={() => handleQuickDestClick("work")}
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Work</span>
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {workAddr ? workAddr.split(",")[0] : "Add work"}
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors"
            onClick={() => setShowSearch(true)}
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-2">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Saved</span>
            <span className="text-xs text-muted-foreground">View all</span>
          </button>
        </div>

        {/* Recent Places */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Places</h3>
          {recentDests.length > 0 ? (
            recentDests.map((dest, index) => (
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
            ))
          ) : (
            [1, 2, 3].map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="h-3 w-32 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-2 w-48 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-accent/50 to-primary/5 rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 mb-3 overflow-hidden h-12">
            <svg viewBox="0 0 300 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="30" x2="300" y2="30" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="8 6" opacity="0.3" />
              <g className="animate-[driveAcross_6s_ease-in-out_infinite]">
                <rect x="0" y="16" width="28" height="12" rx="3" fill="hsl(var(--primary))" />
                <rect x="4" y="10" width="18" height="8" rx="2" fill="hsl(var(--primary))" opacity="0.8" />
                <circle cx="7" cy="30" r="3" fill="hsl(var(--foreground))" />
                <circle cx="21" cy="30" r="3" fill="hsl(var(--foreground))" />
              </g>
            </svg>
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-primary italic mb-2">#goRaahi</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>🇮🇳</span><span>Made for India</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>❤️</span><span>Peer-to-peer rides</span>
            </div>
          </div>
        </div>
      </div>

      {/* SOS Button */}
      <button
        onClick={() => navigate("/sos")}
        className="fixed bottom-20 right-4 z-40 bg-destructive text-destructive-foreground rounded-full p-4 shadow-lg hover:opacity-90 active:scale-95 transition-all"
        aria-label="Emergency SOS"
      >
        <AlertTriangle className="h-6 w-6" />
      </button>

      {/* Ride Options Dialog - appears when destination is selected */}
      <Dialog open={!!selectedDest} onOpenChange={() => setSelectedDest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose an option</DialogTitle>
          </DialogHeader>
          {selectedDest && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground truncate">
                <MapPin className="inline h-3.5 w-3.5 mr-1" />
                {selectedDest.address}
              </p>
              <Button
                className="w-full min-h-[48px] justify-start gap-3"
                onClick={() => {
                  navigateToSearch({ address: selectedDest.address, lat: selectedDest.latitude, lng: selectedDest.longitude });
                  setSelectedDest(null);
                }}
              >
                <Navigation2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">Request a Ride</p>
                  <p className="text-xs opacity-80">Find a driver going your way</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-[48px] justify-start gap-3"
                onClick={() => {
                  navigateToRequest({ address: selectedDest.address, lat: selectedDest.latitude, lng: selectedDest.longitude });
                  setSelectedDest(null);
                }}
              >
                <CalendarPlus className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-semibold">Schedule Future Ride</p>
                  <p className="text-xs text-muted-foreground">Post a request for later</p>
                </div>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Screen Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSearch(false)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
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
            <div className="flex items-center gap-3 mt-3 px-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground truncate">From: {originAddress || "Current location"}</span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {(homeAddr || workAddr) && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved</p>
                {homeAddr && (
                  <button onClick={() => { setShowSearch(false); handleQuickDestClick("home"); }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent/50 transition-colors text-left">
                    <Home className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Home</p>
                      <p className="text-xs text-muted-foreground truncate">{homeAddr}</p>
                    </div>
                  </button>
                )}
                {workAddr && (
                  <button onClick={() => { setShowSearch(false); handleQuickDestClick("work"); }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent/50 transition-colors text-left">
                    <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Work</p>
                      <p className="text-xs text-muted-foreground truncate">{workAddr}</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {recentDests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                {recentDests.map((dest, i) => (
                  <button key={i} onClick={() => { setShowSearch(false); navigateToSearch(dest); }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent/50 transition-colors text-left">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dest.address.split(",")[0]}</p>
                      <p className="text-xs text-muted-foreground truncate">{dest.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!homeAddr && !workAddr && recentDests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-8">Start typing to search for destinations</p>
            )}
          </div>
        </div>
      )}

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
