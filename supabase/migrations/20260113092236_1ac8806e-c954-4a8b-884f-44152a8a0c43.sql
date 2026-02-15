-- Fix PUBLIC_DATA_EXPOSURE: mechanic_details table exposes real-time GPS locations to all users
-- The current policy has "OR true" which bypasses all security checks

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public mechanic profile info only" ON public.mechanic_details;

-- Create restrictive policy: Mechanics can view their own full details
CREATE POLICY "Mechanics can view their own details"
ON public.mechanic_details
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy: Customers can see assigned mechanic's location during active service requests
CREATE POLICY "Customers can view assigned mechanic during active request"
ON public.mechanic_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.mechanic_id = mechanic_details.user_id
      AND sr.customer_id = auth.uid()
      AND sr.status IN ('accepted', 'en_route', 'arrived', 'in_progress')
  )
);

-- Keep existing INSERT policy for mechanics to create their details
-- Keep existing UPDATE policy for mechanics to update their own details

-- Note: For public mechanic discovery (listing available mechanics), 
-- clients must use the mechanic_public_profiles view which excludes sensitive location data