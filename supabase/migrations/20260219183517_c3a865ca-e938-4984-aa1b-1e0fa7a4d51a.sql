
-- Create cancellations table
CREATE TABLE public.cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  reason text NOT NULL,
  free_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert own cancellations"
  ON public.cancellations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own cancellations"
  ON public.cancellations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cancellations"
  ON public.cancellations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
