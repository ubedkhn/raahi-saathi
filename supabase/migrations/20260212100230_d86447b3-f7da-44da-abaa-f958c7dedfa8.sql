
CREATE TABLE public.ride_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is participant of a booking's ride
CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = _booking_id
    AND (
      b.rider_id = _user_id
      OR EXISTS (SELECT 1 FROM rides r WHERE r.id = b.ride_id AND r.driver_id = _user_id)
    )
  );
$$;

CREATE POLICY "Participants can view ride messages"
ON public.ride_messages FOR SELECT
USING (is_booking_participant(booking_id, auth.uid()));

CREATE POLICY "Participants can send ride messages"
ON public.ride_messages FOR INSERT
WITH CHECK (is_booking_participant(booking_id, auth.uid()) AND sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
