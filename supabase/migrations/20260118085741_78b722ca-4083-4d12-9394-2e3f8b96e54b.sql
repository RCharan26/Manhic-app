-- Fix PUBLIC_USER_DATA: mechanic_public_profiles view has no RLS protection
-- Enable security_invoker so the view inherits RLS from mechanic_details

-- Recreate the view with security_invoker enabled
DROP VIEW IF EXISTS public.mechanic_public_profiles;

CREATE VIEW public.mechanic_public_profiles
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  business_name,
  rating,
  total_reviews,
  years_experience,
  specializations,
  is_available,
  is_verified
FROM public.mechanic_details;

-- Add policy to mechanic_details allowing authenticated users to view available mechanics
-- This enables mechanic discovery while requiring authentication to prevent scraping
CREATE POLICY "Authenticated users can discover available mechanics"
ON public.mechanic_details
FOR SELECT
TO authenticated
USING (
  is_available = true 
  AND is_verified = true
);