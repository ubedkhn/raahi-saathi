-- Create security definer function to check if user has booking on a ride (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_has_booking_on_ride(_user_id uuid, _ride_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE rider_id = _user_id
    AND ride_id = _ride_id
  )
$$;

-- Create security definer function to get ride driver_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_ride_driver_id(_ride_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT driver_id FROM rides WHERE id = _ride_id
$$;

-- Drop the problematic circular policies
DROP POLICY IF EXISTS "Users can search scheduled rides" ON public.rides;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Recreate rides SELECT policy using security definer function
CREATE POLICY "Users can search scheduled rides" ON public.rides
FOR SELECT USING (
  status = 'scheduled'::ride_status
  OR driver_id = auth.uid()
  OR public.user_has_booking_on_ride(auth.uid(), id)
);

-- Recreate bookings SELECT policy using security definer function
CREATE POLICY "Users can view own bookings" ON public.bookings
FOR SELECT USING (
  auth.uid() = rider_id
  OR public.get_ride_driver_id(ride_id) = auth.uid()
);