import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageCircle, Share2, Leaf, Award, ChevronRight, PartyPopper } from "lucide-react";

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const [booking, setBooking] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (bookingId) loadBooking();
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [bookingId]);

  const loadBooking = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*, rides(origin_address, destination_address, price_per_km, total_distance_km)")
      .eq("id", bookingId)
      .maybeSingle();
    if (data) setBooking(data);
  };

  const savings = booking ? Math.round((booking.fare_amount || 0) * 0.4) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                fontSize: `${12 + Math.random() * 16}px`,
              }}
            >
              {["🎉", "🎊", "✨", "🌟", "🎈"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md space-y-6 relative z-20">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mx-auto">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're all Set!</h1>
          <p className="text-muted-foreground">Booking Confirmed!</p>
        </div>

        {/* Savings Card */}
        {savings > 0 && (
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-6 text-center">
              <PartyPopper className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-3xl font-bold text-primary">You Saved ₹{savings}</p>
              <p className="text-sm text-muted-foreground mt-1">on this Ride!</p>
            </CardContent>
          </Card>
        )}

        {/* Eco Badge */}
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-full">
                <Leaf className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Eco Saver Badge Earned!</p>
                <p className="text-xs text-muted-foreground">Great Job! You're helping the environment.</p>
              </div>
              <Award className="h-8 w-8 text-secondary ml-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Referral Card */}
        <Card className="gradient-hero text-primary-foreground">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <Share2 className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Invite Friends, Get Free Rides!</p>
                <p className="text-sm opacity-90">Share Raahi and earn rewards</p>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {bookingId && (
            <Button
              className="w-full min-h-[48px]"
              onClick={() => navigate(`/manage-ride/${bookingId}`)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat with Driver
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full min-h-[48px]"
            onClick={() => navigate("/dashboard")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
