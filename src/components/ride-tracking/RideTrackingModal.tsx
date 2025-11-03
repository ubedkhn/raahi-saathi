import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DriverArrivingMap from './DriverArrivingMap';
import OTPVerification from './OTPVerification';
import TripInProgressMap from './TripInProgressMap';

interface RideTrackingModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Booking {
  id: string;
  status: string;
  otp?: string;
  otp_verified: boolean;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  pickup_address: string;
  drop_address: string;
  rider_current_lat?: number;
  rider_current_lng?: number;
  driver_current_lat?: number;
  driver_current_lng?: number;
  estimated_arrival_time?: number;
  distance_remaining?: number;
  ride_id: string;
  rides: {
    driver_id: string;
    profiles: {
      name: string;
      phone: string;
      avatar_url: string;
    };
    vehicles: {
      brand: string;
      model: string;
      registration_no: string;
    };
  };
}

const RideTrackingModal = ({ bookingId, isOpen, onClose }: RideTrackingModalProps) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBooking();
      subscribeToBookingUpdates();
      startLocationTracking();
    }

    return () => {
      if (navigator.geolocation && watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen, bookingId]);

  let watchId: number | null = null;

  const loadBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rides:ride_id (
            driver_id,
            profiles:driver_id (
              name,
              phone,
              avatar_url
            ),
            vehicles:vehicle_id (
              brand,
              model,
              registration_no
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data as unknown as Booking);
    } catch (error: any) {
      console.error('Error loading booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking details',
        variant: 'destructive',
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
          console.log('Booking updated:', payload);
          setBooking((prev) => (prev ? { ...prev, ...payload.new } : null));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update rider's current location in database
          await supabase
            .from('bookings')
            .update({
              rider_current_lat: latitude,
              rider_current_lng: longitude,
            })
            .eq('id', bookingId);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to track your location',
            variant: 'destructive',
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );
    }
  };

  const handleOTPVerified = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          otp_verified: true 
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Ride Started!',
        description: 'Enjoy your journey',
      });
    } catch (error: any) {
      console.error('Error starting ride:', error);
      toast({
        title: 'Error',
        description: 'Failed to start ride',
        variant: 'destructive',
      });
    }
  };

  if (loading || !booking) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading ride details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] p-0">
        {booking.status === 'accepted' || booking.status === 'driver_arriving' ? (
          <DriverArrivingMap booking={booking} />
        ) : booking.status === 'driver_arrived' && !booking.otp_verified ? (
          <OTPVerification 
            booking={booking} 
            onVerified={handleOTPVerified}
          />
        ) : booking.status === 'in_progress' ? (
          <TripInProgressMap booking={booking} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Ride status: {booking.status}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RideTrackingModal;
