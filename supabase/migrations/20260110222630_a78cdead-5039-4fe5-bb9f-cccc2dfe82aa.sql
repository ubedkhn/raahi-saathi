-- Create ride_requests table for rider-initiated ride requests
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL,
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  preferred_time TIMESTAMPTZ NOT NULL,
  seats_needed INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Users can view open requests or their own requests
CREATE POLICY "Users can view open requests or own" ON public.ride_requests
  FOR SELECT USING (status = 'open' OR rider_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create own requests" ON public.ride_requests
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

-- Users can update their own requests
CREATE POLICY "Users can update own requests" ON public.ride_requests
  FOR UPDATE USING (auth.uid() = rider_id);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests" ON public.ride_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();