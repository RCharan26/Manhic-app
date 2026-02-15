-- Fix SECURITY DEFINER views by explicitly setting them to SECURITY INVOKER

-- Drop and recreate the views with proper security
DROP VIEW IF EXISTS public.mechanic_public_profiles;
DROP VIEW IF EXISTS public.public_mechanic_ratings;

-- Recreate mechanic public profiles view with SECURITY INVOKER (default but explicit)
CREATE VIEW public.mechanic_public_profiles
WITH (security_invoker = true)
AS
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

-- Recreate public ratings view with SECURITY INVOKER
CREATE VIEW public.public_mechanic_ratings
WITH (security_invoker = true)
AS
SELECT 
  mechanic_id,
  rating,
  review,
  tags,
  created_at
FROM public.service_ratings;