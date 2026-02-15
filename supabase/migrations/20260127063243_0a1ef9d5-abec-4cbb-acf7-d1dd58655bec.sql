-- Step 1: Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own customer details" ON public.customer_details;
DROP POLICY IF EXISTS "Users can update their own customer details" ON public.customer_details;
DROP POLICY IF EXISTS "Users can view their own customer details" ON public.customer_details;

DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.customer_vehicles;

DROP POLICY IF EXISTS "Authenticated users can discover available mechanics" ON public.mechanic_details;
DROP POLICY IF EXISTS "Customers can view assigned mechanic during active request" ON public.mechanic_details;
DROP POLICY IF EXISTS "Mechanics can update their location" ON public.mechanic_details;
DROP POLICY IF EXISTS "Mechanics can view their own details" ON public.mechanic_details;
DROP POLICY IF EXISTS "Users can insert their own mechanic details" ON public.mechanic_details;
DROP POLICY IF EXISTS "Users can update their own mechanic details" ON public.mechanic_details;
DROP POLICY IF EXISTS "Users can view their own mechanic details" ON public.mechanic_details;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Users can only insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Customers can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Mechanics can view their payouts" ON public.payments;
DROP POLICY IF EXISTS "System can create payments" ON public.payments;

DROP POLICY IF EXISTS "Customers can create ratings for their requests" ON public.service_ratings;
DROP POLICY IF EXISTS "Users can view their own ratings or ratings they gave" ON public.service_ratings;

DROP POLICY IF EXISTS "Customers can create requests" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can update their pending requests" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can view their own requests" ON public.service_requests;
DROP POLICY IF EXISTS "Mechanics can update assigned requests" ON public.service_requests;
DROP POLICY IF EXISTS "Mechanics can view assigned requests" ON public.service_requests;
DROP POLICY IF EXISTS "Mechanics can view pending requests with limited info" ON public.service_requests;