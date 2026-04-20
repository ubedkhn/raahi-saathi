import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Calendar, Clock, Users, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LocationInput, LocationData } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { friendlyError } from "@/lib/utils";

const RequestRide = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth({ requireAuth: true });

  const [originLocation, setOriginLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originLocation) {
      toast({
        title: "Origin Required",
        description: "Please select a pickup location",
        variant: "destructive",
      });
      return;
    }

    if (!destinationLocation) {
      toast({
        title: "Destination Required",
        description: "Please select a destination",
        variant: "destructive",
      });
      return;
    }

    if (!date || !time) {
      toast({
        title: "Date & Time Required",
        description: "Please select when you want to travel",
        variant: "destructive",
      });
      return;
    }

    const preferredTime = new Date(`${date}T${time}`);
    if (preferredTime < new Date()) {
      toast({
        title: "Invalid Time",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('ride_requests')
        .insert({
          rider_id: user.id,
          origin_address: originLocation.address,
          origin_lat: originLocation.latitude,
          origin_lng: originLocation.longitude,
          destination_address: destinationLocation.address,
          destination_lat: destinationLocation.latitude,
          destination_lng: destinationLocation.longitude,
          preferred_time: preferredTime.toISOString(),
          seats_needed: seatsNeeded,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Ride Request Posted! 🎉",
        description: "Drivers in your area will see your request.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Failed to post request",
        description: friendlyError(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            Request a Ride
          </CardTitle>
          <CardDescription>
            Post your travel request and let drivers find you
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Origin */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pickup Location *
              </Label>
              <LocationInput
                placeholder="Where do you need to be picked up?"
                value={originLocation?.address || ""}
                onLocationSelect={setOriginLocation}
                icon="origin"
              />
              {originLocation && (
                <p className="text-xs text-muted-foreground">
                  📍 {originLocation.latitude.toFixed(4)}, {originLocation.longitude.toFixed(4)}
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-destructive" />
                Destination *
              </Label>
              <LocationInput
                placeholder="Where do you want to go?"
                value={destinationLocation?.address || ""}
                onLocationSelect={setDestinationLocation}
                icon="destination"
              />
              {destinationLocation && (
                <p className="text-xs text-muted-foreground">
                  📍 {destinationLocation.latitude.toFixed(4)}, {destinationLocation.longitude.toFixed(4)}
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Time *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            {/* Seats Needed */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Seats Needed
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={seatsNeeded === num ? "default" : "outline"}
                    onClick={() => setSeatsNeeded(num)}
                    className="flex-1 min-h-[44px]"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] text-base font-semibold"
              size="lg"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  Posting Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Post Ride Request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestRide;
