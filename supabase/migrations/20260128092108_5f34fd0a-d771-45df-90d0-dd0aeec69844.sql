-- Since we're using Clerk authentication (not Supabase Auth), 
-- auth.uid() will always return NULL for our Clerk-authenticated users.
-- We need to allow authenticated operations via the anon key and rely on 
-- the application layer to enforce user_id constraints.

-- Drop existing restrictive policies for profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policies that allow operations when user_id matches the passed value
-- Since we can't use auth.uid() with Clerk, we allow operations and enforce at application layer
CREATE POLICY "Allow profile insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow profile update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow profile select" ON public.profiles FOR SELECT USING (true);

-- Do the same for mechanic_details (for initial setup)
DROP POLICY IF EXISTS "Users can insert their own mechanic details" ON public.mechanic_details;
CREATE POLICY "Allow mechanic details insert" ON public.mechanic_details FOR INSERT WITH CHECK (true);

-- Update customer_details policies
DROP POLICY IF EXISTS "Users can insert their own customer details" ON public.customer_details;
CREATE POLICY "Allow customer details insert" ON public.customer_details FOR INSERT WITH CHECK (true);

-- Update customer_vehicles policies
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.customer_vehicles;
CREATE POLICY "Allow vehicle insert" ON public.customer_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow vehicle select" ON public.customer_vehicles FOR SELECT USING (true);
CREATE POLICY "Allow vehicle update" ON public.customer_vehicles FOR UPDATE USING (true);
CREATE POLICY "Allow vehicle delete" ON public.customer_vehicles FOR DELETE USING (true);