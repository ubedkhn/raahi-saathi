import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2, Calendar, Clock, Users, IndianRupee, Bike, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode, searchLocation, debounce } from "@/utils/geocoding";
import { friendlyError } from "@/lib/utils";
import MiniMap from "./MiniMap";

interface Coords {
  lat: number;
  lng: number;
  address: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface Suggestion {
  address: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

function haversineKm(a: Coords, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const SearchModal = ({ open, onClose }: SearchModalProps) => {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<Coords | null>(null);
  const [dest, setDest] = useState<Coords | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [originSugs, setOriginSugs] = useState<Suggestion[]>([]);
  const [destSugs, setDestSugs] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "dest" | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Schedule sheet
  const [showSchedule, setShowSchedule] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [vehicleType, setVehicleType] = useState<"2wheeler" | "4wheeler">("4wheeler");
  const [pricePerKm, setPricePerKm] = useState(11);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setOrigin(null);
    setDest(null);
    setOriginText("");
    setDestText("");
    setOriginSugs([]);
    setDestSugs([]);
    setShowSchedule(false);
    setActiveField(null);

    // Auto-fetch GPS for "From"
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let address = "Current Location";
          try {
            const a = await reverseGeocode(lat, lng);
            if (a) address = a;
          } catch {}
          setOrigin({ lat, lng, address });
          setOriginText(address);
          setGpsLoading(false);
        },
        () => setGpsLoading(false),
        { timeout: 8000 }
      );
    }
  }, [open]);

  // Debounced autocomplete
  const debouncedOriginSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        const results = await searchLocation(q);
        setOriginSugs(results.filter((r) => r.latitude && r.longitude));
      }, 350),
    []
  );
  const debouncedDestSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        const results = await searchLocation(q);
        setDestSugs(results.filter((r) => r.latitude && r.longitude));
      }, 350),
    []
  );

  const handleOriginType = (v: string) => {
    setOriginText(v);
    setActiveField("origin");
    if (v.trim().length >= 3) debouncedOriginSearch(v);
    else setOriginSugs([]);
  };

  const handleDestType = (v: string) => {
    setDestText(v);
    setActiveField("dest");
    if (v.trim().length >= 3) debouncedDestSearch(v);
    else setDestSugs([]);
  };

  const pickOrigin = (s: Suggestion) => {
    setOrigin({ lat: s.latitude, lng: s.longitude, address: s.displayName });
    setOriginText(s.displayName);
    setOriginSugs([]);
    setActiveField(null);
  };

  const pickDest = (s: Suggestion) => {
    setDest({ lat: s.latitude, lng: s.longitude, address: s.displayName });
    setDestText(s.displayName);
    setDestSugs([]);
    setActiveField(null);
  };

  const handleMarkerDrag = async (lat: number, lng: number) => {
    const a = await reverseGeocode(lat, lng).catch(() => null);
    const address = a || originText || "Pinned Location";
    setOrigin({ lat, lng, address });
    setOriginText(address);
  };

  const findMatchesAndNavigate = async (
    requestId: string,
    o: Coords,
    d: Coords,
    preferredTimeISO: string
  ) => {
    // Match: scheduled rides with origin and destination both within ~3 km
    const { data: rides } = await supabase
      .from("rides")
      .select("id, origin_lat, origin_lng, destination_lat, destination_lng")
      .eq("status", "scheduled")
      .gte("start_time", preferredTimeISO)
      .limit(50);

    const matches = (rides || []).filter((r) => {
      const dOrigin = haversineKm(o, { lat: Number(r.origin_lat), lng: Number(r.origin_lng) });
      const dDest = haversineKm(d, { lat: Number(r.destination_lat), lng: Number(r.destination_lng) });
      return dOrigin < 3 && dDest < 3;
    });

    if (matches.length > 0) {
      const params = new URLSearchParams({
        origin_lat: String(o.lat),
        origin_lng: String(o.lng),
        origin_address: o.address,
        dest_lat: String(d.lat),
        dest_lng: String(d.lng),
        dest_address: d.address,
      });
      navigate(`/search-rides?${params.toString()}`);
    } else {
      navigate(`/request-posted/${requestId}`);
    }
  };

  const handleInstant = async () => {
    if (!origin || !dest) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const preferredTime = new Date().toISOString();
      const { data, error } = await supabase
        .from("ride_requests")
        .insert({
          rider_id: user.id,
          origin_address: origin.address,
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_address: dest.address,
          destination_lat: dest.lat,
          destination_lng: dest.lng,
          preferred_time: preferredTime,
          seats_needed: 1,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      onClose();
      await findMatchesAndNavigate(data.id, origin, dest, preferredTime);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't post your request."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!origin || !dest) return;
    if (!date || !time) {
      toast.error("Pick a date and time.");
      return;
    }
    const preferredTime = new Date(`${date}T${time}`);
    if (preferredTime < new Date()) {
      toast.error("Pick a future date and time.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ride_requests")
        .insert({
          rider_id: user.id,
          origin_address: origin.address,
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_address: dest.address,
          destination_lat: dest.lat,
          destination_lng: dest.lng,
          preferred_time: preferredTime.toISOString(),
          seats_needed: seats,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      onClose();
      await findMatchesAndNavigate(data.id, origin, dest, preferredTime.toISOString());
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't post your request."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const ctaEnabled = !!origin && !!dest && !submitting;
  const maxSeats = vehicleType === "2wheeler" ? 1 : 6;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="gradient-hero px-4 pt-3 pb-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-primary-foreground hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-primary-foreground">
          {showSchedule ? "Schedule your ride" : "Plan your ride"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Inputs */}
        <div className="bg-card rounded-2xl border border-border p-3 space-y-3 shadow-sm">
          {/* From */}
          <div className="relative">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <span className="h-2 w-2 rounded-full bg-success" /> From
            </Label>
            <div className="relative">
              <Input
                value={originText}
                onChange={(e) => handleOriginType(e.target.value)}
                onFocus={() => setActiveField("origin")}
                placeholder={gpsLoading ? "Detecting your location…" : "Enter pickup location"}
                className="min-h-[44px] pr-9"
              />
              {gpsLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {activeField === "origin" && originSugs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-56 overflow-auto">
                {originSugs.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickOrigin(s)}
                    className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 border-b border-border/50 last:border-0"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm truncate">{s.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div className="relative">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <span className="h-2 w-2 rounded-full bg-destructive" /> Where to
            </Label>
            <Input
              value={destText}
              onChange={(e) => handleDestType(e.target.value)}
              onFocus={() => setActiveField("dest")}
              placeholder="Where to?"
              className="min-h-[44px]"
            />
            {activeField === "dest" && destSugs.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-56 overflow-auto">
                {destSugs.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickDest(s)}
                    className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 border-b border-border/50 last:border-0"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm truncate">{s.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mini Map */}
        {origin && (
          <MiniMap lat={origin.lat} lng={origin.lng} onChange={handleMarkerDrag} />
        )}

        {/* Schedule sheet */}
        {showSchedule ? (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setVehicleType("2wheeler"); setSeats(1); setPricePerKm(7); }}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium ${
                    vehicleType === "2wheeler" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Bike className="h-4 w-4" /> Bike
                </button>
                <button
                  type="button"
                  onClick={() => { setVehicleType("4wheeler"); setPricePerKm(11); }}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium ${
                    vehicleType === "4wheeler" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Car className="h-4 w-4" /> Car
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Seats</Label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: maxSeats }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSeats(n)}
                      className={`min-w-[44px] h-10 px-3 rounded-lg text-sm font-medium border-2 ${
                        seats === n ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Suggested fare per km
              </Label>
              <Input
                type="number"
                min={1}
                value={pricePerKm}
                onChange={(e) => setPricePerKm(Number(e.target.value) || 0)}
                className="min-h-[44px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Suggested: {vehicleType === "2wheeler" ? "₹6–7/km" : "₹10–12/km"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowSchedule(false)} className="min-h-[44px]">
                Back
              </Button>
              <Button
                onClick={handleScheduleSubmit}
                disabled={!ctaEnabled}
                className="min-h-[44px] bg-success text-success-foreground hover:bg-success/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Schedule"}
              </Button>
            </div>
          </div>
        ) : (
          /* Two CTAs */
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={!ctaEnabled}
              onClick={handleInstant}
              className="rounded-2xl gradient-action text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed p-4 text-left"
            >
              <div className="text-2xl mb-1">🚀</div>
              <p className="font-extrabold text-base leading-tight">Instant Ride</p>
              <p className="text-xs opacity-95 mt-0.5">Find Now</p>
            </button>
            <button
              disabled={!ctaEnabled}
              onClick={() => setShowSchedule(true)}
              className="rounded-2xl bg-success text-success-foreground shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed p-4 text-left"
            >
              <div className="text-2xl mb-1">📅</div>
              <p className="font-extrabold text-base leading-tight">Schedule Ride</p>
              <p className="text-xs opacity-95 mt-0.5">Plan Later</p>
            </button>
          </div>
        )}

        {!showSchedule && (
          <p className="text-center text-xs text-muted-foreground">
            {ctaEnabled
              ? "Tap Instant to find drivers now, or Schedule for later"
              : "Add both pickup & destination to continue"}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchModal;
