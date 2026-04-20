-- (a) Profile PII: drop overly broad ride participant policy
DROP POLICY IF EXISTS "Ride participants can view basic info" ON public.profiles;

-- Safe accessor returning only non-PII fields
CREATE OR REPLACE FUNCTION public.get_ride_participant_profile_safe(_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  gender public.gender,
  kyc_status public.kyc_status
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url, p.gender, p.kyc_status
  FROM public.profiles p
  WHERE p.id = _id
    AND (
      p.id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.rides r
        JOIN public.bookings b ON b.ride_id = r.id
        WHERE (r.driver_id = auth.uid() AND b.rider_id = p.id)
           OR (b.rider_id = auth.uid() AND r.driver_id = p.id)
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_ride_participant_profile_safe(uuid) TO authenticated, anon;

-- (b) Vehicles: drop public read, add participant-scoped policy
DROP POLICY IF EXISTS "Anyone can view verified vehicles" ON public.vehicles;

CREATE POLICY "Ride participants can view ride vehicle"
ON public.vehicles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    LEFT JOIN public.bookings b ON b.ride_id = r.id
    WHERE r.vehicle_id = vehicles.id
      AND (r.driver_id = auth.uid() OR b.rider_id = auth.uid())
  )
);

-- Safe public accessor (brand/model/type only, no registration_no)
CREATE OR REPLACE FUNCTION public.get_ride_vehicle_public(_ride_id uuid)
RETURNS TABLE (
  type public.vehicle_type,
  brand text,
  model text,
  verified boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.type, v.brand, v.model, v.verified
  FROM public.vehicles v
  JOIN public.rides r ON r.vehicle_id = v.id
  WHERE r.id = _ride_id
    AND r.status = 'scheduled'::ride_status;
$$;

GRANT EXECUTE ON FUNCTION public.get_ride_vehicle_public(uuid) TO authenticated, anon;