-- Fix infinite recursion in RLS policies
-- The mechanic_details policy references service_requests, and service_requests policy references mechanic_details

-- Drop the problematic policies that cause circular references
DROP POLICY IF EXISTS "Customers can view assigned mechanic during active request" ON public.mechanic_details;
DROP POLICY IF EXISTS "Mechanics can view pending requests with limited info" ON public.service_requests;

-- Recreate mechanic_details policy without referencing service_requests
-- Allow authenticated users to see available/verified mechanics (simpler approach)
CREATE POLICY "Anyone can view available mechanics" 
ON public.mechanic_details 
FOR SELECT 
USING (is_available = true AND is_verified = true);

-- Recreate service_requests policy without circular reference
-- Mechanics can view pending requests if they are available and verified (check their own record only)
CREATE POLICY "Available mechanics can view pending requests" 
ON public.service_requests 
FOR SELECT 
USING (
  status = 'pending'::request_status 
  AND EXISTS (
    SELECT 1 FROM public.mechanic_details md 
    WHERE md.user_id = (auth.uid())::text 
    AND md.is_available = true 
    AND md.is_verified = true
  )
);