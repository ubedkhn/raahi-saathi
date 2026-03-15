import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MapPin, Clock, User, Car, Phone, CheckCircle, XCircle, 
  Navigation, Play, Square, IndianRupee, AlertCircle, KeyRound, MessageCircle, Ban,
  Share2, ChevronDown, Send
} from "lucide-react";
import PaymentModal from "@/components/ride-tracking/PaymentModal";
import RatingModal from "@/components/ride-tracking/RatingModal";

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

interface RideMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const QUICK_TEXTS = ["I'm arriving", "Please wait", "Where are you?"];

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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bookingId && user) {
      loadBooking();
      subscribeToBookingUpdates();
      loadMessages();
      subscribeToMessages();
    }
  }, [bookingId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, rides!inner(driver_id)`)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      const driverMode = data.rides.driver_id === user?.id;
      setIsDriver(driverMode);

      if (!driverMode && data.rider_id !== user?.id) {
        toast({ title: "Unauthorized", description: "You are not part of this booking", variant: "destructive" });
        navigate('/dashboard');
        return;
      }

      const participantId = driverMode ? data.rider_id : data.rides.driver_id;
      const { data: profile } = await supabase.rpc('get_ride_participant_profile', { participant_id: participantId });

      setBooking({
        ...data,
        rider_profile: profile?.[0] || null,
      });
    } catch (error: any) {
      console.error('Error loading booking:', error);
      toast({ title: "Error", description: error.message || "Failed to load booking", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToBookingUpdates = () => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          setBooking(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...payload.new };
            if (payload.new.status === 'completed' && prev.status !== 'completed' && !isDriver) {
              setTimeout(() => setShowRatingModal(true), 500);
            }
            // OTP toast for rider: notify when OTP appears
            if (!isDriver && payload.new.otp && !prev.otp) {
              toast({ title: "OTP Ready! 🔑", description: "Share this OTP with your driver to start the ride." });
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadMessages = async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from('ride_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`ride-messages-${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ride_messages',
        filter: `booking_id=eq.${bookingId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as RideMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const handleSendQuickText = async (text: string) => {
    if (!user || !bookingId) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('ride_messages').insert({
        booking_id: bookingId,
        sender_id: user.id,
        message: text,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleShareLocation = () => {
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        window.open(url, '_blank');
        setSharingLocation(false);
      },
      (err) => {
        toast({ title: "Location Error", description: "Unable to get your location. Please enable GPS.", variant: "destructive" });
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAcceptBooking = async () => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast({ title: "Booking Accepted!", description: "OTP has been generated for the rider." });
      loadBooking();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectBooking = async () => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast({ title: "Booking Rejected", description: "The booking has been cancelled." });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCancelBooking = async () => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;

      if (isDriver) {
        await supabase.from('rides').update({ status: 'cancelled' }).eq('id', booking?.ride_id);
      }

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast({ title: "Ride Cancelled", description: isDriver ? "Ride has been removed." : "Your booking has been cancelled. The ride is available for others." });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleArrivedAtPickup = async () => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'driver_arrived' }).eq('id', bookingId);
      if (error) throw error;
      toast({ title: "Status Updated", description: "Enter the rider's OTP to start the ride." });
      loadBooking();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 4) {
      toast({ title: "Invalid OTP", description: "Please enter the 4-digit OTP", variant: "destructive" });
      return;
    }
    setVerifyingOtp(true);
    try {
      if (otpInput !== booking?.otp) {
        toast({ title: "Incorrect OTP", description: "Please try again.", variant: "destructive" });
        setVerifyingOtp(false);
        return;
      }
      const { error } = await supabase.from('bookings').update({ status: 'in_progress', otp_verified: true }).eq('id', bookingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      toast({ title: "Ride Started! 🚀", description: "Have a safe journey!" });
      loadBooking();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleEndRide = () => setShowPaymentModal(true);

  const handlePaymentComplete = async (finalAmount: number) => {
    try {
      const { error } = await supabase.from('bookings').update({ status: 'completed', fare_amount: finalAmount }).eq('id', bookingId);
      if (error) throw error;

      if (booking && user) {
        const platformFee = finalAmount * 0.05;
        const driverEarnings = finalAmount - platformFee;

        await supabase.from('wallet_transactions').insert({
          user_id: user.id, type: 'credit', amount: driverEarnings,
          description: `Ride earnings - ${booking.pickup_address} to ${booking.drop_address}`,
          reference_id: booking.id, status: 'completed'
        });
        await supabase.from('wallet_transactions').insert({
          user_id: booking.rider_id, type: 'debit', amount: finalAmount,
          description: `Ride payment - ${booking.pickup_address} to ${booking.drop_address}`,
          reference_id: booking.id, status: 'completed'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['my-rides'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({ title: "Ride Completed! 🎉", description: "Payment recorded successfully." });
      setShowPaymentModal(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCall = () => {
    const phone = booking?.rider_profile?.phone;
    if (phone) window.open(`tel:${phone}`, '_self');
    else toast({ title: "No phone number", description: "Contact info unavailable", variant: "destructive" });
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
            <p className="text-muted-foreground mb-4">This booking may have been cancelled or doesn't exist.</p>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      pending: { className: "", label: "Pending Approval" },
      accepted: { className: "bg-blue-500", label: "Accepted - Go to Pickup" },
      driver_arrived: { className: "bg-orange-500", label: "At Pickup - Enter OTP" },
      in_progress: { className: "bg-success text-success-foreground", label: "Trip In Progress" },
      completed: { className: "", label: "Completed" },
      cancelled: { className: "", label: "Cancelled" },
    };
    const s = map[status] || { className: "", label: status };
    return <Badge variant={status === 'cancelled' ? 'destructive' : status === 'completed' ? 'default' : 'secondary'} className={s.className}>{s.label}</Badge>;
  };

  const contactLabel = isDriver ? (booking.rider_profile?.name || 'Rider') : (booking.rider_profile?.name || 'Driver');
  const canCancel = ['pending', 'accepted', 'driver_arriving', 'driver_arrived'].includes(booking.status);
  const showShareLocation = ['accepted', 'driver_arrived', 'in_progress'].includes(booking.status);
  const showChat = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(booking.status);

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
          <CardDescription>Booking ID: {booking.id.slice(0, 8)}...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Info */}
          <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
            {booking.rider_profile?.avatar_url ? (
              <img src={booking.rider_profile.avatar_url.startsWith('http') ? booking.rider_profile.avatar_url : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${booking.rider_profile.avatar_url}`} alt={contactLabel} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">{contactLabel.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{contactLabel}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {booking.rider_profile?.phone || 'Phone hidden'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={handleCall} title="Call">
                <Phone className="h-4 w-4" />
              </Button>
              {showShareLocation && (
                <Button size="icon" variant="outline" onClick={handleShareLocation} disabled={sharingLocation} title="Share Location">
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Route */}
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

          {/* Quick Chat */}
          {showChat && (
            <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between min-h-[44px]">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Quick Chat
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${chatOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Messages */}
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-muted/50 rounded-lg">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No messages yet</p>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}>
                        <p>{msg.message}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {/* Quick text buttons */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEXTS.map((text) => (
                    <Button
                      key={text}
                      variant="secondary"
                      size="sm"
                      disabled={sendingMessage}
                      onClick={() => handleSendQuickText(text)}
                      className="text-xs"
                    >
                      <Send className="h-3 w-3 mr-1" /> {text}
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Driver Actions */}
          {isDriver && booking.status === 'pending' && (
            <div className="grid grid-cols-2 gap-4">
              <Button variant="destructive" onClick={handleRejectBooking} className="min-h-[48px]">
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
              <Button onClick={handleAcceptBooking} className="min-h-[48px]">
                <CheckCircle className="h-4 w-4 mr-2" /> Accept
              </Button>
            </div>
          )}

          {isDriver && booking.status === 'accepted' && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Navigate to pickup. Tap below when you arrive.</p>
              <Button onClick={handleArrivedAtPickup} className="w-full min-h-[48px]" variant="action">
                <Navigation className="h-4 w-4 mr-2" /> I've Arrived at Pickup
              </Button>
            </div>
          )}

          {isDriver && booking.status === 'driver_arrived' && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">Enter Rider's OTP</h4>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">Ask the rider for their 4-digit OTP.</p>
                <div className="flex gap-3">
                  <Input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                    placeholder="Enter 4-digit OTP" value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl font-bold tracking-widest min-h-[48px]"
                  />
                  <Button onClick={handleVerifyOTP} disabled={verifyingOtp || otpInput.length !== 4} className="min-h-[48px]">
                    {verifyingOtp ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isDriver && booking.status === 'in_progress' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-success">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Trip In Progress</span>
              </div>
              <Button onClick={handleEndRide} variant="destructive" className="w-full min-h-[56px] text-lg font-bold">
                <Square className="h-5 w-5 mr-2" /> End Ride
              </Button>
            </div>
          )}

          {/* Rider view: show OTP when accepted/driver_arriving/driver_arrived */}
          {!isDriver && ['accepted', 'driver_arriving', 'driver_arrived'].includes(booking.status) && (
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              {booking.otp ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Share this OTP with your driver</p>
                  <p className="text-4xl font-bold tracking-widest text-primary">{booking.otp}</p>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">OTP generation failed. Please contact support.</p>
                </div>
              )}
            </div>
          )}

          {!isDriver && booking.status === 'in_progress' && (
            <div className="flex items-center justify-center gap-2 text-success py-4">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <span className="font-medium">Trip In Progress</span>
            </div>
          )}

          {booking.status === 'completed' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
              <h3 className="text-lg font-semibold text-success">Ride Completed!</h3>
              <p className="text-muted-foreground">Thank you for riding with Raahi</p>
            </div>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <Button variant="outline" onClick={handleCancelBooking} className="w-full min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/10">
              <Ban className="h-4 w-4 mr-2" /> Cancel {isDriver ? 'Ride' : 'Booking'}
            </Button>
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

      {/* Rating Modal (auto-triggered on completion for rider) */}
      {showRatingModal && booking && (
        <RatingModal
          booking={booking}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
};

export default ManageRide;
