-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own booking locations" ON public.bookings;

-- Create security definer function to check if user is involved in a ride
CREATE OR REPLACE FUNCTION public.is_ride_participant(_ride_id uuid, _user_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rides 
    WHERE id = _ride_id 
    AND driver_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM bookings 
    WHERE ride_id = _ride_id 
    AND rider_id = _user_id
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can update own booking locations"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = rider_id 
  OR public.is_ride_participant(ride_id, auth.uid())
)
WITH CHECK (
  auth.uid() = rider_id 
  OR public.is_ride_participant(ride_id, auth.uid())
);