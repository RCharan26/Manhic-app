-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Allow mechanic details insert" ON public.mechanic_details;

-- Create a permissive insert policy
CREATE POLICY "Allow mechanic details insert"
ON public.mechanic_details
FOR INSERT
TO authenticated
WITH CHECK (true);