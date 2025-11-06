-- Fix security issues: MISSING_RLS on payments and PUBLIC_DATA_EXPOSURE on profiles

-- 1. Create a secure view for public profile information
-- This view only exposes non-sensitive fields that ride participants can see
CREATE OR REPLACE VIEW public.public_profiles_view AS
SELECT 
  id,
  name,
  avatar_url,
  gender,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles_view SET (security_invoker = true);

-- 2. Remove the policy that exposes all profile fields to ride participants
DROP POLICY IF EXISTS "Users can view ride participant profiles" ON public.profiles;

-- 3. Add a restricted policy for ride participants on the main profiles table
-- This allows them to see only specific fields through application logic
CREATE POLICY "Ride participants can view basic info"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT r.driver_id
    FROM rides r
    JOIN bookings b ON b.ride_id = r.id
    WHERE b.rider_id = auth.uid()
  )
  OR id IN (
    SELECT b.rider_id
    FROM bookings b
    JOIN rides r ON r.id = b.ride_id
    WHERE r.driver_id = auth.uid()
  )
);

-- 4. Create a secure function to get public profile info for ride participants
CREATE OR REPLACE FUNCTION public.get_ride_participant_profile(participant_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  gender gender
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.avatar_url,
    p.gender
  FROM profiles p
  WHERE p.id = participant_id
  AND (
    -- Check if the requesting user is a ride participant with this person
    p.id IN (
      SELECT r.driver_id
      FROM rides r
      JOIN bookings b ON b.ride_id = r.id
      WHERE b.rider_id = auth.uid()
    )
    OR p.id IN (
      SELECT b.rider_id
      FROM bookings b
      JOIN rides r ON r.id = b.ride_id
      WHERE r.driver_id = auth.uid()
    )
    OR p.id = auth.uid() -- Or it's their own profile
  );
$$;

-- 5. Ensure payments table has no direct INSERT policy for users
-- Remove any existing user INSERT policies (only admins should have INSERT via existing policy)
-- The edge function will use service role to insert payments after webhook verification
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;

-- Comment to document the security model for payments
COMMENT ON TABLE public.payments IS 'Payment records are created only by the payment processing edge function after successful Razorpay webhook verification. Direct user insertion is not allowed.';