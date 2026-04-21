
-- 1. WALLET TRANSACTIONS: Remove user INSERT policy
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;

-- Secure server-side function to credit driver + debit rider on ride completion
CREATE OR REPLACE FUNCTION public.complete_ride_payment(_booking_id uuid, _final_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking RECORD;
  _driver_id uuid;
  _platform_fee numeric;
  _driver_earnings numeric;
BEGIN
  -- Validate caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch booking + driver
  SELECT b.id, b.rider_id, b.ride_id, b.status, r.driver_id
    INTO _booking
    FROM public.bookings b
    JOIN public.rides r ON r.id = b.ride_id
    WHERE b.id = _booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Only the ride driver can complete payment
  IF _booking.driver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the driver can complete payment for this booking';
  END IF;

  -- Validate amount
  IF _final_amount IS NULL OR _final_amount <= 0 OR _final_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid fare amount';
  END IF;

  -- Prevent double-payout
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE reference_id = _booking_id AND type = 'credit'
  ) THEN
    RAISE EXCEPTION 'Payment already recorded for this booking';
  END IF;

  _platform_fee := round(_final_amount * 0.05, 2);
  _driver_earnings := _final_amount - _platform_fee;

  -- Update booking status + amount
  UPDATE public.bookings
    SET status = 'completed', fare_amount = _final_amount, updated_at = now()
    WHERE id = _booking_id;

  -- Driver credit
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference_id, status)
  VALUES (
    _booking.driver_id, 'credit', _driver_earnings,
    'Ride earnings', _booking_id, 'completed'
  );

  -- Rider debit
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, reference_id, status)
  VALUES (
    _booking.rider_id, 'debit', _final_amount,
    'Ride payment', _booking_id, 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_ride_payment(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_ride_payment(uuid, numeric) TO authenticated;

-- 2. USER ROLES: prevent self-assignment of admin / any role
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. REALTIME: restrict channel subscriptions to the user's own topic namespace.
-- Users may only subscribe to topics that include their auth.uid() (e.g., "req-<uid>", "user-<uid>", or system tables they already have RLS on).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read their own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can read their own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow postgres_changes (broadcast filtered server-side by table RLS)
  extension = 'postgres_changes'
  -- Or topic explicitly contains the requesting user's uid
  OR (topic IS NOT NULL AND position(auth.uid()::text in topic) > 0)
);

DROP POLICY IF EXISTS "Authenticated users can broadcast on own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can broadcast on own topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic IS NOT NULL AND position(auth.uid()::text in topic) > 0
);
