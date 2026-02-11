import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMyVehicles } from "@/hooks/useVehicles";
import { useQueryClient } from "@tanstack/react-query";

interface RideRequest {
  id: string;
  rider_id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  preferred_time: string;
  seats_needed: number;
  status: string;
  created_at: string;
}

const DriverRequests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth({ requireAuth: true });
  const { data: vehicles = [] } = useMyVehicles();
  const queryClient = useQueryClient();

  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRequests();
      // Realtime subscription for new/updated requests
      const channel = supabase
        .channel("ride-requests-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => {
          loadRequests();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("status", "open")
        .order("preferred_time", { ascending: true });

      if (error) throw error;
      // Exclude own requests
      setRequests((data || []).filter((r) => r.rider_id !== user?.id));
    } catch (error: any) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: RideRequest) => {
    if (!user) return;

    // Need at least one vehicle
    if (vehicles.length === 0) {
      toast({ title: "No Vehicle", description: "Add a vehicle before accepting requests.", variant: "destructive" });
      return;
    }

    setAcceptingId(request.id);
    try {
      const vehicle = vehicles[0]; // Use first vehicle

      // Calculate simple distance for fare estimate
      const R = 6371;
      const dLat = (request.destination_lat - request.origin_lat) * Math.PI / 180;
      const dLon = (request.destination_lng - request.origin_lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(request.origin_lat * Math.PI / 180) * Math.cos(request.destination_lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const pricePerKm = vehicle.type === "2wheeler" ? 7 : 11;
      const fare = Math.round(distance * pricePerKm);

      // Create ride
      const { data: ride, error: rideError } = await supabase
        .from("rides")
        .insert({
          driver_id: user.id,
          vehicle_id: vehicle.id,
          origin_address: request.origin_address,
          origin_lat: request.origin_lat,
          origin_lng: request.origin_lng,
          destination_address: request.destination_address,
          destination_lat: request.destination_lat,
          destination_lng: request.destination_lng,
          start_time: request.preferred_time,
          seats_available: request.seats_needed || 1,
          price_per_km: pricePerKm,
          total_distance_km: Math.round(distance * 10) / 10,
          status: "scheduled",
        })
        .select()
        .single();

      if (rideError) throw rideError;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          ride_id: ride.id,
          rider_id: request.rider_id,
          pickup_address: request.origin_address,
          pickup_lat: request.origin_lat,
          pickup_lng: request.origin_lng,
          drop_address: request.destination_address,
          drop_lat: request.destination_lat,
          drop_lng: request.destination_lng,
          fare_amount: fare,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update ride_request status to matched
      await supabase.from("ride_requests").update({ status: "matched" }).eq("id", request.id);

      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });

      toast({ title: "Request Accepted! ✅", description: "Booking created. Waiting for rider confirmation." });
      navigate(`/manage-ride/${booking.id}`);
    } catch (error: any) {
      console.error("Accept error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAcceptingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Rider Requests</h1>
        <p className="text-sm text-muted-foreground">Open requests from riders looking for a ride</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No open requests right now</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later or post your own ride</p>
          </CardContent>
        </Card>
      ) : (
        requests.map((req) => (
          <Card key={req.id} className="overflow-hidden">
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="truncate">{req.origin_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="truncate">{req.destination_address}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(req.preferred_time).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {req.seats_needed || 1} seat(s)
                </span>
              </div>
              <Button
                onClick={() => handleAcceptRequest(req)}
                disabled={acceptingId === req.id}
                className="w-full min-h-[44px]"
              >
                {acceptingId === req.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Accept Request
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default DriverRequests;
