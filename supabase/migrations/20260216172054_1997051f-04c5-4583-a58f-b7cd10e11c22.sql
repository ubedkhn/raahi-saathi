
-- Create function to expire old ride requests
CREATE OR REPLACE FUNCTION public.expire_old_ride_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ride_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'open' AND preferred_time < now();
END;
$$;
