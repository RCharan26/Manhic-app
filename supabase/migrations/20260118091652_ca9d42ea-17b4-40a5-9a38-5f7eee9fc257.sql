-- Fix PUBLIC_USER_DATA: public_mechanic_ratings view has no RLS protection
-- Enable security_invoker so the view inherits RLS from service_ratings

-- Recreate the view with security_invoker enabled
DROP VIEW IF EXISTS public.public_mechanic_ratings;

CREATE VIEW public.public_mechanic_ratings
WITH (security_invoker = on)
AS SELECT 
  mechanic_id,
  rating,
  review,
  tags,
  created_at
FROM public.service_ratings;