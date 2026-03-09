
-- 1. Create notification_type enum
CREATE TYPE public.notification_type AS ENUM (
  'booking_accepted',
  'ride_booked',
  'ride_cancelled',
  'payment_received',
  'booking_started',
  'ride_completed'
);

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6. Trigger function for booking status changes
CREATE OR REPLACE FUNCTION public.notify_on_booking_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  _driver_id UUID;
  _rider_name TEXT;
  _driver_name TEXT;
  _origin TEXT;
  _destination TEXT;
BEGIN
  -- Get ride driver and addresses
  SELECT r.driver_id, r.origin_address, r.destination_address
    INTO _driver_id, _origin, _destination
    FROM rides r WHERE r.id = NEW.ride_id;

  SELECT name INTO _rider_name FROM profiles WHERE id = NEW.rider_id;
  SELECT name INTO _driver_name FROM profiles WHERE id = _driver_id;

  -- New booking inserted → notify driver
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      _driver_id,
      'ride_booked',
      'New Booking Request',
      _rider_name || ' booked a ride from ' || _origin || ' to ' || _destination,
      jsonb_build_object('booking_id', NEW.id, 'ride_id', NEW.ride_id)
    );
  END IF;

  -- Booking accepted → notify rider
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.rider_id,
      'booking_accepted',
      'Booking Accepted! 🎉',
      _driver_name || ' accepted your ride from ' || _origin || ' to ' || _destination,
      jsonb_build_object('booking_id', NEW.id, 'ride_id', NEW.ride_id)
    );
  END IF;

  -- Booking cancelled → notify other party
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Notify driver
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      _driver_id,
      'ride_cancelled',
      'Booking Cancelled',
      _rider_name || ' cancelled the ride from ' || _origin || ' to ' || _destination,
      jsonb_build_object('booking_id', NEW.id, 'ride_id', NEW.ride_id)
    );
    -- Notify rider
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.rider_id,
      'ride_cancelled',
      'Ride Cancelled',
      'Your ride from ' || _origin || ' to ' || _destination || ' has been cancelled',
      jsonb_build_object('booking_id', NEW.id, 'ride_id', NEW.ride_id)
    );
  END IF;

  -- Booking completed → notify rider
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.rider_id,
      'ride_completed',
      'Ride Completed ✅',
      'Your ride from ' || _origin || ' to ' || _destination || ' is complete. Please rate your experience.',
      jsonb_build_object('booking_id', NEW.id, 'ride_id', NEW.ride_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Create trigger on bookings
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_booking_status_change();
