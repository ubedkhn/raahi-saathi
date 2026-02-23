-- ============================================================
-- RAAHI - COMPLETE DATABASE SCHEMA EXPORT
-- Generated: 2026-02-23
-- 
-- This script contains ALL tables, enums, functions, triggers,
-- views, indexes, RLS policies, storage buckets, and realtime
-- configuration for the Raahi ride-sharing application.
--
-- INSTRUCTIONS:
-- 1. Create a new Supabase project
-- 2. Run this script in the SQL Editor
-- 3. Set up your Edge Functions separately
-- 4. Configure auth providers (Google OAuth) in Supabase dashboard
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================
-- SECTION 2: CUSTOM ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('user', 'driver', 'admin');
CREATE TYPE public.booking_status AS ENUM (
  'pending', 'confirmed', 'started', 'completed', 'cancelled',
  'accepted', 'driver_arriving', 'driver_arrived', 'in_progress'
);
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.payment_method AS ENUM ('upi', 'card', 'wallet', 'cash');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.ride_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.vehicle_type AS ENUM ('2wheeler', '4wheeler');

-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- 3.1 PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user'::app_role,
  gender public.gender,
  date_of_birth DATE,
  kyc_status public.kyc_status DEFAULT 'pending'::kyc_status,
  avatar_url TEXT,
  permanent_address TEXT,
  aadhaar_number TEXT,
  aadhaar_verified BOOLEAN DEFAULT false,
  driving_license_number TEXT,
  driving_license_photo_url TEXT,
  driving_license_verified BOOLEAN DEFAULT false,
  kyc_document_url TEXT,
  selfie_url TEXT,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT profiles_phone_key UNIQUE (phone)
);

-- 3.2 USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- 3.3 VEHICLES
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  registration_no TEXT NOT NULL,
  type public.vehicle_type NOT NULL,
  insurance_expiry DATE NOT NULL,
  verified BOOLEAN DEFAULT false,
  vehicle_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT vehicles_registration_no_key UNIQUE (registration_no)
);

-- 3.4 RIDES
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  seats_available INTEGER NOT NULL,
  price_per_km NUMERIC NOT NULL,
  total_distance_km NUMERIC,
  route_polyline TEXT,
  status public.ride_status DEFAULT 'scheduled'::ride_status,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.5 BOOKINGS
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  drop_address TEXT NOT NULL,
  drop_lat NUMERIC NOT NULL,
  drop_lng NUMERIC NOT NULL,
  fare_amount NUMERIC NOT NULL,
  status public.booking_status DEFAULT 'pending'::booking_status,
  otp TEXT,
  otp_verified BOOLEAN DEFAULT false,
  rider_current_lat NUMERIC,
  rider_current_lng NUMERIC,
  driver_current_lat NUMERIC,
  driver_current_lng NUMERIC,
  estimated_arrival_time INTEGER,
  distance_remaining NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.6 CANCELLATIONS
CREATE TABLE public.cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  ride_id UUID REFERENCES public.rides(id),
  reason TEXT NOT NULL,
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 PAYMENTS
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  method public.payment_method NOT NULL,
  status public.payment_status DEFAULT 'pending'::payment_status,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.8 RATINGS
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.9 PREFERENCES
CREATE TABLE public.preferences (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  gender_preference public.gender,
  smoking_allowed BOOLEAN DEFAULT false,
  luggage_allowed BOOLEAN DEFAULT true,
  max_passengers INTEGER DEFAULT 4,
  women_only_mode BOOLEAN DEFAULT false,
  music_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT preferences_user_id_key UNIQUE (user_id)
);

-- 3.10 RIDE REQUESTS
CREATE TABLE public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL,
  origin_address TEXT NOT NULL,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  preferred_time TIMESTAMPTZ NOT NULL,
  seats_needed INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open'::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.11 EMERGENCY CONTACTS
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.12 SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  ride_id UUID REFERENCES public.rides(id),
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  admin_response TEXT,
  status public.ticket_status DEFAULT 'open'::ticket_status,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.13 SUPPORT MESSAGES
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id),
  sender_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.14 RIDE MESSAGES
CREATE TABLE public.ride_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.15 WALLET TRANSACTIONS
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed'::text,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.16 ADMIN ACTIVITY LOG
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 4: VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.public_profiles_view AS
  SELECT id, name, avatar_url, gender, created_at
  FROM profiles;

-- ============================================================
-- SECTION 5: INDEXES
-- ============================================================
CREATE INDEX idx_bookings_ride ON public.bookings USING btree (ride_id);
CREATE INDEX idx_bookings_rider ON public.bookings USING btree (rider_id);
CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);
CREATE INDEX idx_payments_booking ON public.payments USING btree (booking_id);
CREATE INDEX idx_ratings_reviewee ON public.ratings USING btree (reviewee_id);
CREATE INDEX idx_rides_driver ON public.rides USING btree (driver_id);
CREATE INDEX idx_rides_start_time ON public.rides USING btree (start_time);
CREATE INDEX idx_rides_status ON public.rides USING btree (status);
CREATE INDEX idx_vehicles_user ON public.vehicles USING btree (user_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions USING btree (created_at DESC);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions USING btree (user_id);

-- ============================================================
-- SECTION 6: FUNCTIONS
-- ============================================================

-- 6.1 Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Generate booking OTP
CREATE OR REPLACE FUNCTION public.generate_booking_otp()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- 6.3 Set booking OTP on status change
CREATE OR REPLACE FUNCTION public.set_booking_otp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.otp := generate_booking_otp();
    NEW.otp_verified := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

-- 6.4 Handle new user (auto-create profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, kyc_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULL
  );
  RETURN NEW;
END;
$$;

-- 6.5 Has role check (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6.6 Check if user has booking on ride
CREATE OR REPLACE FUNCTION public.user_has_booking_on_ride(_user_id UUID, _ride_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE rider_id = _user_id AND ride_id = _ride_id
  )
$$;

-- 6.7 Check if user is ride participant
CREATE OR REPLACE FUNCTION public.is_ride_participant(_ride_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rides WHERE id = _ride_id AND driver_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM bookings WHERE ride_id = _ride_id AND rider_id = _user_id
  );
$$;

-- 6.8 Get ride driver ID
CREATE OR REPLACE FUNCTION public.get_ride_driver_id(_ride_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT driver_id FROM rides WHERE id = _ride_id
$$;

-- 6.9 Check if user is booking participant
CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

-- 6.10 Expire old ride requests
CREATE OR REPLACE FUNCTION public.expire_old_ride_requests()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE ride_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'open' AND preferred_time < now();
END;
$$;

-- 6.11 Get ride participant profile
CREATE OR REPLACE FUNCTION public.get_ride_participant_profile(participant_id UUID)
RETURNS TABLE(id UUID, name TEXT, avatar_url TEXT, gender gender)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.avatar_url, p.gender
  FROM profiles p
  WHERE p.id = participant_id
  AND (
    p.id IN (
      SELECT r.driver_id FROM rides r
      JOIN bookings b ON b.ride_id = r.id
      WHERE b.rider_id = auth.uid()
    )
    OR p.id IN (
      SELECT b.rider_id FROM bookings b
      JOIN rides r ON r.id = b.ride_id
      WHERE r.driver_id = auth.uid()
    )
    OR p.id = auth.uid()
  );
$$;

-- ============================================================
-- SECTION 7: TRIGGERS
-- ============================================================

-- Auth trigger: auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Booking OTP trigger
CREATE TRIGGER booking_otp_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_otp();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SECTION 8: ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 9: RLS POLICIES
-- ============================================================

-- === PROFILES ===
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Ride participants can view basic info" ON public.profiles FOR SELECT
  USING (
    (id IN (SELECT r.driver_id FROM rides r JOIN bookings b ON b.ride_id = r.id WHERE b.rider_id = auth.uid()))
    OR
    (id IN (SELECT b.rider_id FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE r.driver_id = auth.uid()))
  );

-- === USER ROLES ===
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === VEHICLES ===
CREATE POLICY "Users can view own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view verified vehicles" ON public.vehicles FOR SELECT USING (verified = true);
CREATE POLICY "Admins can manage all vehicles" ON public.vehicles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === RIDES ===
CREATE POLICY "Drivers can create rides" ON public.rides FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update own rides" ON public.rides FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can delete own rides" ON public.rides FOR DELETE USING (auth.uid() = driver_id);
CREATE POLICY "Users can search scheduled rides" ON public.rides FOR SELECT
  USING ((status = 'scheduled'::ride_status) OR (driver_id = auth.uid()) OR user_has_booking_on_ride(auth.uid(), id));
CREATE POLICY "Admins can manage all rides" ON public.rides FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all rides" ON public.rides FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- === BOOKINGS ===
CREATE POLICY "Riders can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Users can update own booking locations" ON public.bookings FOR UPDATE
  USING ((auth.uid() = rider_id) OR is_ride_participant(ride_id, auth.uid()))
  WITH CHECK ((auth.uid() = rider_id) OR is_ride_participant(ride_id, auth.uid()));
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT
  USING ((auth.uid() = rider_id) OR (get_ride_driver_id(ride_id) = auth.uid()));
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === CANCELLATIONS ===
CREATE POLICY "Users can insert own cancellations" ON public.cancellations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own cancellations" ON public.cancellations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all cancellations" ON public.cancellations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === PAYMENTS ===
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((auth.uid() = rider_id) OR (auth.uid() = driver_id));
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === RATINGS ===
CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can view ratings for participated rides" ON public.ratings FOR SELECT
  USING (
    (auth.uid() = reviewer_id) OR (auth.uid() = reviewee_id)
    OR (ride_id IN (
      SELECT rides.id FROM rides WHERE rides.driver_id = auth.uid()
      UNION
      SELECT bookings.ride_id FROM bookings WHERE bookings.rider_id = auth.uid()
    ))
  );
CREATE POLICY "Admins can view all ratings" ON public.ratings FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- === PREFERENCES ===
CREATE POLICY "Users can view own preferences" ON public.preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.preferences FOR UPDATE USING (auth.uid() = user_id);

-- === RIDE REQUESTS ===
CREATE POLICY "Users can create own requests" ON public.ride_requests FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Users can update own requests" ON public.ride_requests FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Users can view open requests or own" ON public.ride_requests FOR SELECT
  USING ((status = 'open'::text) OR (rider_id = auth.uid()));
CREATE POLICY "Admins can manage all requests" ON public.ride_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === EMERGENCY CONTACTS ===
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- === SUPPORT TICKETS ===
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === SUPPORT MESSAGES ===
CREATE POLICY "Users can send messages to own tickets" ON public.support_messages FOR INSERT
  WITH CHECK ((auth.uid() = sender_id) AND (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())));
CREATE POLICY "Users can view own ticket messages" ON public.support_messages FOR SELECT
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
CREATE POLICY "Admins can send messages to any ticket" ON public.support_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND (auth.uid() = sender_id));
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- === RIDE MESSAGES ===
CREATE POLICY "Participants can send ride messages" ON public.ride_messages FOR INSERT
  WITH CHECK (is_booking_participant(booking_id, auth.uid()) AND (sender_id = auth.uid()));
CREATE POLICY "Participants can view ride messages" ON public.ride_messages FOR SELECT
  USING (is_booking_participant(booking_id, auth.uid()));

-- === WALLET TRANSACTIONS ===
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- === ADMIN ACTIVITY LOG ===
CREATE POLICY "Only admins can insert logs" ON public.admin_activity_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can view logs" ON public.admin_activity_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SECTION 10: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;

-- ============================================================
-- SECTION 11: STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc_documents', 'kyc_documents', false);

-- Storage policies for KYC documents
CREATE POLICY "Users can upload own KYC docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc_documents' AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- SECTION 12: EDGE FUNCTION SECRETS (set these in Supabase dashboard)
-- ============================================================
-- You need to set these secrets in your Supabase project:
--   GOOGLE_MAPS_API_KEY   - Google Maps API key for geocoding & maps
--   MAPBOX_ACCESS_TOKEN   - Mapbox token (if still used)
--
-- Set via: supabase secrets set GOOGLE_MAPS_API_KEY=your_key_here

-- ============================================================
-- DONE! Your Raahi schema is fully deployed.
-- ============================================================
