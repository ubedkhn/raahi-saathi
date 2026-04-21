import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users, Car } from "lucide-react";
import { toast } from "sonner";
import RideTrackingModal from "@/components/ride-tracking/RideTrackingModal";
import { LocationInput, LocationData } from "@/components/common";
import { reverseGeocode } from "@/utils/geocoding";
import { friendlyError } from "@/lib/utils";

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  start_time: string;
  seats_available: number;
  price_per_km: number;
  total_distance_km: number;
  status: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
  vehicles: {
    brand: string;
    model: string;
    type: string;
  };
}

const SearchRides = () => {
  const navigate = useNavigate();
  const [originLocation, setOriginLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/auth"); return; }
      setUser(u);
    };
    init();
    // Auto-fill pickup with current GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          if (address) {
            setOriginLocation({
              address,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        } catch (e) {
          console.log("Reverse geocoding failed:", e);
        }
      }, () => {});
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let query = supabase
        .from("rides")
        .select(`
          *,
          profiles!rides_driver_id_fkey(name, avatar_url),
          vehicles(brand, model, type)
        `)
        .eq("status", "scheduled");

      if (originLocation) {
        query = query.ilike("origin_address", `%${originLocation.address.split(',')[0]}%`);
      }
      if (destinationLocation) {
        query = query.ilike("destination_address", `%${destinationLocation.address.split(',')[0]}%`);
      }
      if (date && time) {
        query = query.gte("start_time", `${date}T${time}:00`)
                     .lte("start_time", `${date}T23:59:59`);
      } else if (date) {
        query = query.gte("start_time", `${date}T00:00:00`)
                     .lte("start_time", `${date}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRides(data || []);

      if (data?.length === 0) {
        toast.info("No rides found", {
          description: "Try adjusting your search criteria",
        });
      } else {
        toast.success(`Found ${data?.length} ride(s)`);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Search failed", {
        description: friendlyError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (rideId: string) => {
    if (!user) {
      toast.error("Please login to book a ride");
      return;
    }

    try {
      const ride = rides.find(r => r.id === rideId);
      if (!ride) return;

      // Use selected locations or fall back to ride's origin/destination
      const pickupLat = originLocation?.latitude ?? Number(ride.origin_lat);
      const pickupLng = originLocation?.longitude ?? Number(ride.origin_lng);
      const dropLat = destinationLocation?.latitude ?? Number(ride.destination_lat);
      const dropLng = destinationLocation?.longitude ?? Number(ride.destination_lng);

      // Book via server-side validation
      const { data: bookingResp, error: invokeError } = await supabase.functions.invoke('validate-booking', {
        body: {
          ride_id: rideId,
          pickup_address: originLocation?.address || ride.origin_address,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          drop_address: destinationLocation?.address || ride.destination_address,
          drop_lat: dropLat,
          drop_lng: dropLng,
        },
      });

      if (invokeError) throw invokeError;
      const result = typeof bookingResp === 'string' ? JSON.parse(bookingResp) : bookingResp;
      if (result.error) throw new Error(result.error);

      // If we arrived from SearchModal with an open request, mark it as matched
      const requestId = new URLSearchParams(window.location.search).get("request_id");
      if (requestId) {
        await supabase
          .from("ride_requests")
          .update({ status: "matched" })
          .eq("id", requestId)
          .eq("rider_id", user.id);
      }

      toast.success("Ride booked successfully!", {
        description: "Waiting for driver to accept...",
      });

      // Set booking ID for tracking
      setActiveBookingId(result.booking.id);

      // Refresh search
      handleSearch(new Event("submit") as any);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("Booking failed", {
        description: friendlyError(error),
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Search for Rides</CardTitle>
          <CardDescription>
            Find rides going your way and travel together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocationInput
                placeholder="Pickup location"
                value={originLocation?.address || ""}
                onLocationSelect={setOriginLocation}
                icon="origin"
              />
              <LocationInput
                placeholder="Where to?"
                value={destinationLocation?.address || ""}
                onLocationSelect={setDestinationLocation}
                icon="destination"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[44px]"
                placeholder="Date"
              />
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="min-h-[44px]"
                placeholder="Time"
              />
            </div>
            <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching..." : "Search Rides"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {rides.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Rides</h2>
          {rides.map((ride) => (
            <Card key={ride.id} className="active:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {ride.profiles?.avatar_url ? (
                          <img
                            src={ride.profiles.avatar_url}
                            alt={ride.profiles.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{ride.profiles?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          <Car className="inline w-3 h-3 mr-1" />
                          {ride.vehicles?.brand} {ride.vehicles?.model}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-success" />
                        <span className="text-sm">{ride.origin_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-destructive" />
                        <span className="text-sm">{ride.destination_address}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>
                        <Calendar className="inline w-3 h-3 mr-1" />
                        {new Date(ride.start_time).toLocaleDateString()}
                      </span>
                      <span>
                        <Users className="inline w-3 h-3 mr-1" />
                        {ride.seats_available} seats
                      </span>
                      <span className="font-semibold text-foreground">
                        ₹{ride.price_per_km}/km
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Button
                      onClick={() => handleBook(ride.id)}
                      className="w-full md:w-auto min-h-[44px]"
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ride Tracking Modal */}
      {activeBookingId && (
        <RideTrackingModal
          bookingId={activeBookingId}
          isOpen={showTracking}
          onClose={() => {
            setShowTracking(false);
            setActiveBookingId(null);
          }}
        />
      )}
    </div>
  );
};

export default SearchRides;
