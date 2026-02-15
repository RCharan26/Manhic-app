-- Disable RLS on customer_details to allow direct Supabase client queries
-- Since we're using Clerk for auth, not Supabase Auth, RLS policies that check auth.uid() fail
ALTER TABLE public.customer_details DISABLE ROW LEVEL SECURITY;

-- Also disable on mechanic_details for mechanic profile access
ALTER TABLE public.mechanic_details DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies since they're no longer active
DROP POLICY IF EXISTS "Users can view their own customer details" ON public.customer_details;
DROP POLICY IF EXISTS "Users can insert their own customer details" ON public.customer_details;
DROP POLICY IF EXISTS "Users can update their own customer details" ON public.customer_details;

DROP POLICY IF EXISTS "Users can view their own mechanic details" ON public.mechanic_details;
DROP POLICY IF EXISTS "Mechanics can view other mechanics public info" ON public.mechanic_details;
DROP POLICY IF EXISTS "Users can insert their own mechanic details" ON public.mechanic_details;
DROP POLICY IF EXISTS "Users can update their own mechanic details" ON public.mechanic_details;
