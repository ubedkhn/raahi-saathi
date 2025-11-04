import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, MapPin, Calendar, Users, Car } from "lucide-react";
import { toast } from "sonner";
import RideTrackingModal from "@/components/ride-tracking/RideTrackingModal";
import BottomNav from "@/components/BottomNav";

interface Ride {
  id: string;
  origin_address: string;
  destination_address: string;
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
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

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

      if (origin) {
        query = query.ilike("origin_address", `%${origin}%`);
      }
      if (destination) {
        query = query.ilike("destination_address", `%${destination}%`);
      }
      if (date) {
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
        description: error.message,
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

      // Calculate fare
      const calculatedFare = ride.total_distance_km 
        ? Number(ride.total_distance_km) * Number(ride.price_per_km)
        : 0;

      const { data: bookingData, error } = await supabase.from("bookings").insert([{
        ride_id: rideId,
        rider_id: user.id,
        pickup_address: origin || ride.origin_address,
        pickup_lat: 0, // Would come from map selection
        pickup_lng: 0,
        drop_address: destination || ride.destination_address,
        drop_lat: 0,
        drop_lng: 0,
        fare_amount: calculatedFare,
        status: "pending",
      }]).select().single();

      if (error) throw error;

      toast.success("Ride booked successfully!", {
        description: "Waiting for driver to accept...",
      });
      
      // Set booking ID for tracking
      setActiveBookingId(bookingData.id);
      
      // Simulate driver accepting after 2 seconds (in real app, driver would accept)
      setTimeout(async () => {
        await supabase
          .from('bookings')
          .update({ status: 'accepted' })
          .eq('id', bookingData.id);
        
        setShowTracking(true);
        toast.success("Driver accepted your ride!", {
          description: "Track your driver in real-time",
        });
      }, 2000);
      
      // Refresh search
      handleSearch(new Event("submit") as any);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error("Booking failed", {
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 animate-fade-in pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

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
                <div className="space-y-2">
                  <Label htmlFor="origin">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    From
                  </Label>
                  <Input
                    id="origin"
                    placeholder="Enter origin city/area"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    To
                  </Label>
                  <Input
                    id="destination"
                    placeholder="Enter destination city/area"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
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
              <Card key={ride.id} className="hover-scale">
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
                        className="w-full md:w-auto"
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
      </div>

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

      <BottomNav />
    </div>
  );
};

export default SearchRides;
