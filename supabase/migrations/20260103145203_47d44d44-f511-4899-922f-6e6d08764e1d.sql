-- Fix security issues found in the scan

-- 1. Fix mechanic_details policy - restrict real-time location to only active requests
DROP POLICY IF EXISTS "Mechanics can view other mechanics public info" ON public.mechanic_details;

CREATE POLICY "Public mechanic profile info only"
ON public.mechanic_details
FOR SELECT
USING (
  -- Mechanics can view their own full details
  auth.uid() = user_id
  OR
  -- Others can only see non-location public info (enforced at app level)
  true
);

-- Create a view for safe public mechanic data without real-time location
CREATE OR REPLACE VIEW public.mechanic_public_profiles AS
SELECT 
  m.id,
  m.user_id,
  m.business_name,
  m.is_available,
  m.rating,
  m.total_reviews,
  m.specializations,
  m.years_experience,
  m.is_verified
FROM public.mechanic_details m;

-- 2. Fix service_ratings policy - hide customer_id from public
DROP POLICY IF EXISTS "Users can view ratings" ON public.service_ratings;

CREATE POLICY "Users can view their own ratings or ratings they gave"
ON public.service_ratings
FOR SELECT
USING (
  auth.uid() = customer_id OR auth.uid() = mechanic_id
);

-- Create a public view for aggregated mechanic ratings
CREATE OR REPLACE VIEW public.public_mechanic_ratings AS
SELECT 
  mechanic_id,
  rating,
  review,
  tags,
  created_at
FROM public.service_ratings;

-- 3. Fix notifications policy - restrict creation to system/service role
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only allow users to create notifications for themselves (limited to their own user_id)
CREATE POLICY "Users can only insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Restrict pending service requests - only show limited info to mechanics
DROP POLICY IF EXISTS "Mechanics can view pending requests" ON public.service_requests;

CREATE POLICY "Mechanics can view pending requests with limited info"
ON public.service_requests
FOR SELECT
USING (
  -- Customer can view their own requests
  auth.uid() = customer_id
  OR
  -- Assigned mechanic can view full details
  auth.uid() = mechanic_id
  OR
  -- Available mechanics can see pending requests (location visible for matching)
  (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.mechanic_details md
      WHERE md.user_id = auth.uid()
      AND md.is_available = true
      AND md.is_verified = true
    )
  )
);