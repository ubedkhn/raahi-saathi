import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Car, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RecentRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    await Promise.all([fetchBookings(session.user.id), fetchRides(session.user.id)]);
  };

  const fetchBookings = async (userId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rides:ride_id (
          origin_address,
          destination_address,
          start_time
        )
      `)
      .eq('rider_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const fetchRides = async (userId: string) => {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load rides",
        variant: "destructive",
      });
    } else {
      setRides(data || []);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* As Rider */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          As Rider ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No bookings yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Booking</CardTitle>
                    {getStatusBadge(booking.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Pickup</p>
                      <p className="text-sm text-muted-foreground">{booking.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Drop</p>
                      <p className="text-sm text-muted-foreground">{booking.drop_address}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-lg font-bold text-primary">₹{booking.fare_amount}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* As Driver */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Car className="w-5 h-5" />
          As Driver ({rides.length})
        </h2>
        {rides.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No rides posted yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Ride</CardTitle>
                    {getStatusBadge(ride.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(ride.start_time).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">From</p>
                      <p className="text-sm text-muted-foreground">{ride.origin_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">To</p>
                      <p className="text-sm text-muted-foreground">{ride.destination_address}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{ride.seats_available} seats available</p>
                    <p className="text-lg font-bold text-primary">₹{ride.price_per_km}/km</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RecentRides;
