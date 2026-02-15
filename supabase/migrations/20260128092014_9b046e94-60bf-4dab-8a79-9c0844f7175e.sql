-- Recreate RLS policies with text comparison

-- Profiles policies
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid()::text = user_id);

-- Customer details policies
CREATE POLICY "Users can insert their own customer details" ON public.customer_details FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own customer details" ON public.customer_details FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own customer details" ON public.customer_details FOR SELECT USING (auth.uid()::text = user_id);

-- Customer vehicles policies
CREATE POLICY "Users can delete their own vehicles" ON public.customer_vehicles FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own vehicles" ON public.customer_vehicles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.customer_vehicles FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own vehicles" ON public.customer_vehicles FOR SELECT USING (auth.uid()::text = user_id);

-- Mechanic details policies
CREATE POLICY "Authenticated users can discover available mechanics" ON public.mechanic_details FOR SELECT USING ((is_available = true) AND (is_verified = true));
CREATE POLICY "Customers can view assigned mechanic during active request" ON public.mechanic_details FOR SELECT USING (EXISTS (SELECT 1 FROM service_requests sr WHERE sr.mechanic_id = mechanic_details.user_id AND sr.customer_id = auth.uid()::text AND sr.status = ANY (ARRAY['accepted'::request_status, 'en_route'::request_status, 'arrived'::request_status, 'in_progress'::request_status])));
CREATE POLICY "Mechanics can update their location" ON public.mechanic_details FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Mechanics can view their own details" ON public.mechanic_details FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own mechanic details" ON public.mechanic_details FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own mechanic details" ON public.mechanic_details FOR UPDATE USING (auth.uid()::text = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid()::text = user_id);

-- Messages policies
CREATE POLICY "Receivers can mark messages as read" ON public.messages FOR UPDATE USING (auth.uid()::text = receiver_id) WITH CHECK (auth.uid()::text = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING ((auth.uid()::text = sender_id) OR (auth.uid()::text = receiver_id));

-- Notifications policies
CREATE POLICY "Users can mark their notifications as read" ON public.notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can only insert their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid()::text = user_id);

-- Payments policies
CREATE POLICY "Customers can view their own payments" ON public.payments FOR SELECT USING (auth.uid()::text = customer_id);
CREATE POLICY "Mechanics can view their payouts" ON public.payments FOR SELECT USING (auth.uid()::text = mechanic_id);
CREATE POLICY "System can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid()::text = customer_id);

-- Service ratings policies
CREATE POLICY "Customers can create ratings for their requests" ON public.service_ratings FOR INSERT WITH CHECK (auth.uid()::text = customer_id);
CREATE POLICY "Users can view their own ratings or ratings they gave" ON public.service_ratings FOR SELECT USING ((auth.uid()::text = customer_id) OR (auth.uid()::text = mechanic_id));

-- Service requests policies
CREATE POLICY "Customers can create requests" ON public.service_requests FOR INSERT WITH CHECK (auth.uid()::text = customer_id);
CREATE POLICY "Customers can update their pending requests" ON public.service_requests FOR UPDATE USING ((auth.uid()::text = customer_id) AND (status = ANY (ARRAY['pending'::request_status, 'accepted'::request_status, 'en_route'::request_status])));
CREATE POLICY "Customers can view their own requests" ON public.service_requests FOR SELECT USING (auth.uid()::text = customer_id);
CREATE POLICY "Mechanics can update assigned requests" ON public.service_requests FOR UPDATE USING (auth.uid()::text = mechanic_id);
CREATE POLICY "Mechanics can view assigned requests" ON public.service_requests FOR SELECT USING (auth.uid()::text = mechanic_id);
CREATE POLICY "Mechanics can view pending requests with limited info" ON public.service_requests FOR SELECT USING ((auth.uid()::text = customer_id) OR (auth.uid()::text = mechanic_id) OR ((status = 'pending'::request_status) AND (EXISTS (SELECT 1 FROM mechanic_details md WHERE md.user_id = auth.uid()::text AND md.is_available = true AND md.is_verified = true))));

-- Update has_role function to work with text user_id
CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recreate admin policy using updated function
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid()::text, 'admin'::app_role));