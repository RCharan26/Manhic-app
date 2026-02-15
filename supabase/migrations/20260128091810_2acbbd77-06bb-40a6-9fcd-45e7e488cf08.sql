-- Drop views that depend on user_id columns
DROP VIEW IF EXISTS public.mechanic_public_profiles CASCADE;
DROP VIEW IF EXISTS public.public_mechanic_ratings CASCADE;

-- Alter column types from uuid to text
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.customer_details ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.customer_vehicles ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.mechanic_details ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.user_roles ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE public.messages ALTER COLUMN receiver_id TYPE text USING receiver_id::text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.payments ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE public.payments ALTER COLUMN mechanic_id TYPE text USING mechanic_id::text;
ALTER TABLE public.service_ratings ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE public.service_ratings ALTER COLUMN mechanic_id TYPE text USING mechanic_id::text;
ALTER TABLE public.service_requests ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE public.service_requests ALTER COLUMN mechanic_id TYPE text USING mechanic_id::text;

-- Recreate views with text types
CREATE VIEW public.mechanic_public_profiles
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  business_name,
  is_available,
  is_verified,
  rating,
  total_reviews,
  years_experience,
  specializations
FROM public.mechanic_details
WHERE is_verified = true;

CREATE VIEW public.public_mechanic_ratings
WITH (security_invoker=on) AS
SELECT 
  sr.mechanic_id,
  sr.rating,
  sr.review,
  sr.tags,
  sr.created_at
FROM public.service_ratings sr
ORDER BY sr.created_at DESC;