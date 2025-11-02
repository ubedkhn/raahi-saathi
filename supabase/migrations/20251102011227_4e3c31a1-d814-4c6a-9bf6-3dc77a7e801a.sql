-- Create user_roles table with proper security (roles must be separate from profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add new KYC fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS permanent_address TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS driving_license_number TEXT,
  ADD COLUMN IF NOT EXISTS driving_license_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS driving_license_verified BOOLEAN DEFAULT FALSE;

-- Update profiles policies to be more restrictive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view ride participant profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT r.driver_id FROM rides r
      INNER JOIN bookings b ON b.ride_id = r.id
      WHERE b.rider_id = auth.uid()
    )
    OR
    id IN (
      SELECT b.rider_id FROM bookings b
      INNER JOIN rides r ON r.id = b.ride_id
      WHERE r.driver_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Update rides policy for search functionality
DROP POLICY IF EXISTS "Anyone can view scheduled rides" ON public.rides;

CREATE POLICY "Users can search scheduled rides" ON public.rides
  FOR SELECT USING (
    status = 'scheduled'
    OR driver_id = auth.uid()
    OR id IN (SELECT ride_id FROM bookings WHERE rider_id = auth.uid())
  );

CREATE POLICY "Admins can view all rides" ON public.rides
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all rides" ON public.rides
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update ratings policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;

CREATE POLICY "Users can view ratings for participated rides" ON public.ratings
  FOR SELECT USING (
    auth.uid() = reviewer_id
    OR auth.uid() = reviewee_id
    OR ride_id IN (
      SELECT id FROM rides WHERE driver_id = auth.uid()
      UNION
      SELECT ride_id FROM bookings WHERE rider_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all ratings" ON public.ratings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Update payments policies to prevent fraud
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = rider_id OR auth.uid() = driver_id);

CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update bookings policies
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update vehicles policies
CREATE POLICY "Admins can manage all vehicles" ON public.vehicles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs" ON public.admin_activity_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert logs" ON public.admin_activity_log
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));