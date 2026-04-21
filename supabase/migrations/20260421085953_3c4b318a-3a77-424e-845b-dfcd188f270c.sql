-- Rider-only OTP read
CREATE OR REPLACE FUNCTION public.get_booking_otp(_booking_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT otp FROM public.bookings
  WHERE id = _booking_id AND rider_id = auth.uid();
$$;

-- Driver-only verify (OTP value never returned to client)
CREATE OR REPLACE FUNCTION public.verify_booking_otp(_booking_id uuid, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver uuid;
  _stored text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.driver_id, b.otp INTO _driver, _stored
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = _booking_id;

  IF _driver IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF _driver <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned driver can verify OTP';
  END IF;

  IF _stored IS NULL OR _stored <> _otp THEN
    RETURN false;
  END IF;

  UPDATE public.bookings
  SET status = 'in_progress', otp_verified = true, updated_at = now()
  WHERE id = _booking_id;

  RETURN true;
END;
$$;

-- Safe profile view (no PII)
CREATE OR REPLACE VIEW public.profile_safe
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.gender,
  p.kyc_status,
  (SELECT round(avg(rating)::numeric, 1) FROM public.ratings WHERE reviewee_id = p.id) AS rating
FROM public.profiles p;

GRANT SELECT ON public.profile_safe TO authenticated, anon;

-- Drop unrestricted KYC upload policy if it exists; owner-scoped INSERT remains
DROP POLICY IF EXISTS "Allow authenticated uploads to kyc_documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload kyc_documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload kyc_documents" ON storage.objects;