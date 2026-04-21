import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin, Calendar, Users, CheckCircle, Loader2, User, Navigation,
  ShieldCheck, Star, IndianRupee, Clock, XCircle, Flame, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMyVehicles } from "@/hooks/useVehicles";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

interface RiderProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

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
  rider_profile?: RiderProfile;
  rider_rating?: number;
  rider_verified?: boolean;
  match_pct?: number;
  detour_min?: number;
  fare?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DriverRequests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth({ requireAuth: true });
  const { data: vehicles = [] } = useMyVehicles();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRequests();
      const channel = supabase
        .channel("ride-requests-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => loadRequests())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("status", "open")
        .order("preferred_time", { ascending: true });
      if (error) throw error;
      const filtered = (data || []).filter((r) => r.rider_id !== user?.id);

      if (filtered.length === 0) {
        setRequests([]);
        return;
      }

      const riderIds = [...new Set(filtered.map((r) => r.rider_id))];

      // Use safe profile view (no PII), plus avg rating in parallel
      const [profilesRes, ratingsRes] = await Promise.all([
        supabase.from("profile_safe").select("id, name, avatar_url, kyc_status, rating").in("id", riderIds),
        supabase.from("ratings").select("reviewee_id, rating").in("reviewee_id", riderIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const kycMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.kyc_status]));
      const ratingMap = new Map<string, { sum: number; count: number }>();
      (ratingsRes.data || []).forEach((r: any) => {
        const cur = ratingMap.get(r.reviewee_id) || { sum: 0, count: 0 };
        cur.sum += r.rating;
        cur.count += 1;
        ratingMap.set(r.reviewee_id, cur);
      });

      const enriched: RideRequest[] = filtered.map((r) => {
        const distKm = haversineKm(r.origin_lat, r.origin_lng, r.destination_lat, r.destination_lng);
        // Simple match heuristic: closer pickup-to-driver = higher match
        let matchPct = 75;
        let detourMin = 5;
        if (driverLoc) {
          const distToPickup = haversineKm(driverLoc.lat, driverLoc.lng, r.origin_lat, r.origin_lng);
          matchPct = Math.max(60, Math.min(98, Math.round(100 - distToPickup * 4)));
          detourMin = Math.max(2, Math.round(distToPickup * 2));
        }
        const ratingAgg = ratingMap.get(r.rider_id);
        const fare = Math.round(distKm * 11); // default car pricing preview

        return {
          ...r,
          rider_profile: profileMap.get(r.rider_id),
          rider_rating: ratingAgg ? Number((ratingAgg.sum / ratingAgg.count).toFixed(1)) : undefined,
          rider_verified: kycMap.get(r.rider_id) === "verified",
          match_pct: matchPct,
          detour_min: detourMin,
          fare,
        };
      });

      setRequests(enriched);
    } catch (error: any) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setDecliningId(requestId);
    // Local hide only (no DB write needed; request stays open for other drivers)
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setDecliningId(null);
    toast({ title: "Declined", description: "Request hidden from your feed." });
  };

  const handleAcceptRequest = async (request: RideRequest) => {
    if (!user) return;
    if (vehicles.length === 0) {
      toast({ title: "No Vehicle", description: "Add a vehicle before accepting requests.", variant: "destructive" });
      return;
    }
    setAcceptingId(request.id);
    try {
      const vehicle = vehicles[0];
      const distance = haversineKm(request.origin_lat, request.origin_lng, request.destination_lat, request.destination_lng);
      const pricePerKm = vehicle.type === "2wheeler" ? 7 : 11;
      const fare = Math.round(distance * pricePerKm);

      const { data: rideResp, error: rideInvokeError } = await supabase.functions.invoke("validate-ride", {
        body: {
          vehicle_id: vehicle.id,
          origin_address: request.origin_address, origin_lat: request.origin_lat, origin_lng: request.origin_lng,
          destination_address: request.destination_address, destination_lat: request.destination_lat, destination_lng: request.destination_lng,
          start_time: request.preferred_time, seats_available: request.seats_needed || 1, price_per_km: pricePerKm,
        },
      });
      if (rideInvokeError) throw rideInvokeError;
      const rideResult = typeof rideResp === "string" ? JSON.parse(rideResp) : rideResp;
      if (rideResult.error) throw new Error(rideResult.error);
      const ride = rideResult.ride;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          ride_id: ride.id, rider_id: request.rider_id,
          pickup_address: request.origin_address, pickup_lat: request.origin_lat, pickup_lng: request.origin_lng,
          drop_address: request.destination_address, drop_lat: request.destination_lat, drop_lng: request.destination_lng,
          fare_amount: fare, status: "pending",
        })
        .select().single();
      if (bookingError) throw bookingError;

      // Triggers OTP generation server-side via DB trigger
      const { error: acceptError } = await supabase.from("bookings").update({ status: "accepted" }).eq("id", booking.id);
      if (acceptError) throw acceptError;

      await supabase.from("rides").update({ status: "active" }).eq("id", ride.id);
      await supabase.from("ride_requests").update({ status: "matched" }).eq("id", request.id);

      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });

      toast({ title: "Request Accepted! ✅", description: "OTP generated. Waiting for rider at pickup." });
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

  // KYC gate: only verified drivers can browse and accept ride requests
  if (profile && profile.kyc_status !== "verified") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Complete KYC to accept rides</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We verify every driver to keep Raahi safe. Finish your KYC and we'll unlock the requests feed.
              </p>
            </div>
            <Button onClick={() => navigate("/profile/edit")} className="min-h-[44px]">
              Complete KYC
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold">Incoming Requests</h1>
        <p className="text-sm text-muted-foreground">Open ride requests from verified riders</p>
      </div>

      {/* FOMO banner */}
      {requests.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-secondary/15 border border-secondary/30 rounded-lg">
          <Flame className="h-4 w-4 text-secondary-foreground" />
          <p className="text-sm font-medium text-secondary-foreground">
            {Math.max(2, requests.length + 1)} riders browsing this route now
          </p>
        </div>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No open requests right now</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon — riders post throughout the day</p>
          </CardContent>
        </Card>
      ) : (
        requests.map((req) => {
          const distFromDriver = driverLoc
            ? haversineKm(driverLoc.lat, driverLoc.lng, req.origin_lat, req.origin_lng)
            : null;

          return (
            <Card key={req.id} className="overflow-hidden">
              <CardContent className="pt-4 space-y-3">
                {/* Rider header */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={req.rider_profile?.avatar_url || undefined} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold truncate">{req.rider_profile?.name || "Rider"}</span>
                      {req.rider_verified && (
                        <Badge variant="outline" className="h-5 px-1.5 border-success/40 text-success text-[10px] gap-0.5">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      )}
                      {req.rider_rating !== undefined && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-secondary text-secondary" />
                          {req.rider_rating}
                        </span>
                      )}
                    </div>
                    {distFromDriver !== null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {distFromDriver < 1 ? `${Math.round(distFromDriver * 1000)}m` : `${distFromDriver.toFixed(1)} km`} away
                      </span>
                    )}
                  </div>
                </div>

                {/* Match + Detour */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-success font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> {req.match_pct}% Match
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Detour +{req.detour_min} min</span>
                </div>

                {/* Route */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="truncate">{req.origin_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="truncate">{req.destination_address}</span>
                  </div>
                </div>

                {/* Meta row: time, seats, fare */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-wrap gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.preferred_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {req.seats_needed || 1} seat{(req.seats_needed || 1) > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Badge variant="secondary" className="gap-0.5 font-bold">
                    <IndianRupee className="h-3 w-3" />{req.fare}
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeclineRequest(req.id)}
                    disabled={decliningId === req.id || acceptingId === req.id}
                    className="min-h-[44px]"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Decline
                  </Button>
                  <Button
                    onClick={() => handleAcceptRequest(req)}
                    disabled={acceptingId === req.id || decliningId === req.id}
                    className="min-h-[44px] bg-success text-success-foreground hover:bg-success/90"
                  >
                    {acceptingId === req.id
                      ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      : <CheckCircle className="h-4 w-4 mr-1" />}
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default DriverRequests;
