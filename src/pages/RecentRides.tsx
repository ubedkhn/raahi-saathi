import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Car, User, Star, XCircle, Loader2, Clock } from "lucide-react";
import { useMyBookings, useMyRides, useMyRideRequests } from "@/hooks/useRides";
import { useToast } from "@/hooks/use-toast";
import RatingModal from "@/components/ride-tracking/RatingModal";
import CancelRideModal from "@/components/ride-tracking/CancelRideModal";

const UPCOMING_BOOKING = ['pending', 'confirmed', 'started'];
const ACTIVE_BOOKING = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'];
const HISTORY_BOOKING = ['completed', 'cancelled'];

interface CancelTarget {
  type: "booking" | "ride" | "request";
  bookingId?: string;
  rideId?: string;
  rideRequestId?: string;
}

const RecentRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: bookings = [], isLoading: bookingsLoading } = useMyBookings();
  const { data: rides = [], isLoading: ridesLoading } = useMyRides();
  const { data: rideRequests = [], isLoading: requestsLoading } = useMyRideRequests();
  const [ratingBooking, setRatingBooking] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);

  const loading = bookingsLoading || ridesLoading || requestsLoading;

  const filterBookings = (tab: string) => {
    if (tab === 'upcoming') return bookings.filter(b => UPCOMING_BOOKING.includes(b.status || ''));
    if (tab === 'active') return bookings.filter(b => ACTIVE_BOOKING.includes(b.status || ''));
    if (tab === 'history') return bookings.filter(b => HISTORY_BOOKING.includes(b.status || ''));
    return [];
  };

  const filterRides = (tab: string) => {
    if (tab === 'upcoming') return rides.filter(r => r.status === 'scheduled');
    if (tab === 'active') return rides.filter(r => r.status === 'active');
    if (tab === 'history') return rides.filter(r => r.status === 'completed' || r.status === 'cancelled');
    return [];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      accepted: "default",
      confirmed: "secondary",
      driver_arriving: "default",
      driver_arrived: "default",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
      scheduled: "secondary",
      active: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const renderTab = (tab: string) => {
    const tabBookings = filterBookings(tab);
    const tabRides = filterRides(tab);
    const openRequests = tab === 'upcoming' ? rideRequests.filter(r => r.status === 'open') : [];
    const isEmpty = tabBookings.length === 0 && tabRides.length === 0 && openRequests.length === 0;
    const isActive = tab === 'active';
    const isHistory = tab === 'history';
    const isUpcoming = tab === 'upcoming';

    if (isEmpty) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No {tab} rides</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Open ride requests in Upcoming */}
        {openRequests.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" /> Open Requests ({openRequests.length})
            </h3>
            {openRequests.map((req) => (
              <Card key={req.id} className="mb-3 overflow-hidden">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate text-ellipsis">{req.origin_address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-destructive flex-shrink-0" />
                        <span className="truncate text-ellipsis">{req.destination_address}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">open</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(req.preferred_time).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">{req.seats_needed || 1} seat(s)</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => setCancelTarget({ type: "request", rideRequestId: req.id })}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel Request
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Bookings (as rider) */}
        {tabBookings.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <User className="w-4 h-4" /> As Rider ({tabBookings.length})
            </h3>
            {tabBookings.map((booking) => (
              <Card
                key={booking.id}
                className={`mb-3 overflow-hidden ${isActive ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={isActive ? () => navigate(`/manage-ride/${booking.id}`) : undefined}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">{booking.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-destructive flex-shrink-0" />
                        <span className="truncate">{booking.drop_address}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">{getStatusBadge(booking.status || '')}</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(booking.created_at || '').toLocaleDateString()}
                    </span>
                    <span className="font-bold text-primary">₹{booking.fare_amount}</span>
                  </div>
                  {isActive && (
                    <p className="text-xs text-primary text-center">Tap to track ride →</p>
                  )}
                  {isUpcoming && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget({ type: "booking", bookingId: booking.id });
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel Booking
                    </Button>
                  )}
                  {isHistory && booking.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => { e.stopPropagation(); setRatingBooking(booking); }}
                    >
                      <Star className="w-4 h-4 mr-1" /> Rate Driver
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Rides (as driver) */}
        {tabRides.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Car className="w-4 h-4" /> As Driver ({tabRides.length})
            </h3>
            {tabRides.map((ride) => (
              <Card
                key={ride.id}
                className={`mb-3 overflow-hidden ${isActive ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={isActive ? () => navigate(`/manage-ride/${ride.id}`) : undefined}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">{ride.origin_address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-destructive flex-shrink-0" />
                        <span className="truncate">{ride.destination_address}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">{getStatusBadge(ride.status || '')}</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ride.start_time).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-primary">₹{ride.price_per_km}/km</span>
                  </div>
                  {isActive && (
                    <p className="text-xs text-primary text-center">Tap to manage ride →</p>
                  )}
                  {(isUpcoming || isActive) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget({ type: "ride", rideId: ride.id });
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel Ride
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">{renderTab('upcoming')}</TabsContent>
        <TabsContent value="active" className="mt-4">{renderTab('active')}</TabsContent>
        <TabsContent value="history" className="mt-4">{renderTab('history')}</TabsContent>
      </Tabs>

      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
        />
      )}

      {cancelTarget && (
        <CancelRideModal
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          type={cancelTarget.type}
          bookingId={cancelTarget.bookingId}
          rideId={cancelTarget.rideId}
          rideRequestId={cancelTarget.rideRequestId}
        />
      )}
    </div>
  );
};

export default RecentRides;
