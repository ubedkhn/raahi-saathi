import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { 
  MapPin, Clock, User, Car, Phone, CheckCircle, XCircle, 
  Navigation, Play, Square, IndianRupee, AlertCircle, KeyRound
} from "lucide-react";
import PaymentModal from "@/components/ride-tracking/PaymentModal";

interface Booking {
  id: string;
  ride_id: string;
  rider_id: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  pickup_address: string;
  drop_address: string;
  fare_amount: number;
  status: string;
  otp: string | null;
  otp_verified: boolean;
  created_at: string;
  rider_profile?: {
    name: string;
    phone?: string;
    avatar_url: string | null;
  } | null;
}

const ManageRide = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth({ requireAuth: true });
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (bookingId && user) {
      loadBooking();
      subscribeToBookingUpdates();
    }
  }, [bookingId, user]);

  const loadBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rides!inner(driver_id)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      // Verify user is the driver
      if (data.rides.driver_id !== user?.id) {
        toast({
          title: "Unauthorized",
          description: "You are not the driver for this ride",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Fetch rider profile
      const { data: riderProfile } = await supabase
        .rpc('get_ride_participant_profile', { participant_id: data.rider_id });

      setBooking({
        ...data,
        rider_profile: riderProfile?.[0] || null,
      });
    } catch (error: any) {
      console.error('Error loading booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          setBooking(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptBooking = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'accepted' })
        .eq('id', bookingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      toast({
        title: "Booking Accepted!",
        description: "The rider has been notified. OTP has been generated.",
      });

      loadBooking(); // Reload to get OTP
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept booking",
        variant: "destructive",
      });
    }
  };

  const handleRejectBooking = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      toast({
        title: "Booking Rejected",
        description: "The booking has been cancelled.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject booking",
        variant: "destructive",
      });
    }
  };

  const handleArrivedAtPickup = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'driver_arrived' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Rider has been notified of your arrival. Enter their OTP to start the ride.",
      });

      loadBooking();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 4-digit OTP from the rider",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);

    try {
      if (otpInput !== booking?.otp) {
        toast({
          title: "Incorrect OTP",
          description: "The OTP doesn't match. Please try again.",
          variant: "destructive",
        });
        setVerifyingOtp(false);
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          otp_verified: true 
        })
        .eq('id', bookingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      toast({
        title: "Ride Started! 🚀",
        description: "OTP verified successfully. Have a safe journey!",
      });

      loadBooking();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleEndRide = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;

      // Create wallet transactions
      if (booking) {
        // Credit driver (95% - 5% platform fee)
        const driverAmount = Number(booking.fare_amount) * 0.95;
        await supabase.from('wallet_transactions').insert({
          user_id: user?.id,
          type: 'credit',
          amount: driverAmount,
          description: `Ride earnings - ${booking.pickup_address} to ${booking.drop_address}`,
          reference_id: booking.id,
          status: 'completed'
        });

        // Debit rider
        await supabase.from('wallet_transactions').insert({
          user_id: booking.rider_id,
          type: 'debit',
          amount: booking.fare_amount,
          description: `Ride payment - ${booking.pickup_address} to ${booking.drop_address}`,
          reference_id: booking.id,
          status: 'completed'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      toast({
        title: "Ride Completed! 🎉",
        description: "Payment received. Thank you for riding with Raahi!",
      });

      setShowPaymentModal(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete ride",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This booking may have been cancelled or doesn't exist.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Approval</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-500">Accepted - Go to Pickup</Badge>;
      case 'driver_arrived':
        return <Badge className="bg-orange-500">At Pickup - Enter OTP</Badge>;
      case 'in_progress':
        return <Badge className="bg-success text-success-foreground">Trip In Progress</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Manage Booking
            </CardTitle>
            {getStatusBadge(booking.status)}
          </div>
          <CardDescription>
            Booking ID: {booking.id.slice(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rider Info */}
          <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{booking.rider_profile?.name || 'Rider'}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {booking.rider_profile?.phone || 'Phone hidden'}
              </div>
            </div>
          </div>

          {/* Route Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-3 w-3 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium">{booking.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-3 w-3 text-destructive-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Drop</p>
                <p className="font-medium">{booking.drop_address}</p>
              </div>
            </div>
          </div>

          {/* Fare */}
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-success" />
              <span className="font-medium">Fare Amount</span>
            </div>
            <span className="text-2xl font-bold text-success">₹{booking.fare_amount}</span>
          </div>

          {/* Action Buttons based on status */}
          {booking.status === 'pending' && (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="destructive" 
                onClick={handleRejectBooking}
                className="min-h-[48px]"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={handleAcceptBooking}
                className="min-h-[48px]"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
            </div>
          )}

          {booking.status === 'accepted' && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Navigate to the pickup location. Tap below when you arrive.
              </p>
              <Button 
                onClick={handleArrivedAtPickup}
                className="w-full min-h-[48px]"
                variant="action"
              >
                <Navigation className="h-4 w-4 mr-2" />
                I've Arrived at Pickup
              </Button>
            </div>
          )}

          {booking.status === 'driver_arrived' && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Enter Rider's OTP</h4>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                  Ask the rider for their 4-digit OTP to start the trip.
                </p>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Enter 4-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl font-bold tracking-widest min-h-[48px]"
                  />
                  <Button 
                    onClick={handleVerifyOTP}
                    disabled={verifyingOtp || otpInput.length !== 4}
                    className="min-h-[48px]"
                  >
                    {verifyingOtp ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {booking.status === 'in_progress' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-success">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Trip In Progress</span>
              </div>
              <Button 
                onClick={handleEndRide}
                variant="destructive"
                className="w-full min-h-[56px] text-lg font-bold"
              >
                <Square className="h-5 w-5 mr-2" />
                End Ride
              </Button>
            </div>
          )}

          {booking.status === 'completed' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
              <h3 className="text-lg font-semibold text-success">Ride Completed!</h3>
              <p className="text-muted-foreground">Thank you for riding with Raahi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && booking && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
          fareAmount={booking.fare_amount}
          pickupAddress={booking.pickup_address}
          dropAddress={booking.drop_address}
          riderName={booking.rider_profile?.name || 'Rider'}
        />
      )}
    </div>
  );
};

export default ManageRide;
