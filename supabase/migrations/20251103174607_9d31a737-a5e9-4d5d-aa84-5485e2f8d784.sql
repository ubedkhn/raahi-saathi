-- Add OTP and live tracking fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS otp TEXT,
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rider_current_lat NUMERIC,
ADD COLUMN IF NOT EXISTS rider_current_lng NUMERIC,
ADD COLUMN IF NOT EXISTS driver_current_lat NUMERIC,
ADD COLUMN IF NOT EXISTS driver_current_lng NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_arrival_time INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS distance_remaining NUMERIC; -- in kilometers

-- Update booking_status enum to include new states
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'driver_arriving';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'driver_arrived';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';

-- Function to generate 4-digit OTP
CREATE OR REPLACE FUNCTION generate_booking_otp()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- Trigger to generate OTP when booking is accepted
CREATE OR REPLACE FUNCTION set_booking_otp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.otp := generate_booking_otp();
    NEW.otp_verified := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_otp_trigger ON public.bookings;
CREATE TRIGGER booking_otp_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_otp();

-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Grant update permissions on location fields for users involved in the booking
CREATE POLICY "Users can update own booking locations"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = rider_id 
  OR auth.uid() IN (
    SELECT driver_id FROM rides WHERE id = bookings.ride_id
  )
)
WITH CHECK (
  auth.uid() = rider_id 
  OR auth.uid() IN (
    SELECT driver_id FROM rides WHERE id = bookings.ride_id
  )
);