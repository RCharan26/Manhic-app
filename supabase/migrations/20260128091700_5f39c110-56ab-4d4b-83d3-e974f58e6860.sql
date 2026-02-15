-- Drop ALL foreign key constraints that reference auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.customer_details DROP CONSTRAINT IF EXISTS customer_details_user_id_fkey;
ALTER TABLE public.customer_vehicles DROP CONSTRAINT IF EXISTS customer_vehicles_user_id_fkey;
ALTER TABLE public.mechanic_details DROP CONSTRAINT IF EXISTS mechanic_details_user_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_mechanic_id_fkey;
ALTER TABLE public.service_ratings DROP CONSTRAINT IF EXISTS service_ratings_customer_id_fkey;
ALTER TABLE public.service_ratings DROP CONSTRAINT IF EXISTS service_ratings_mechanic_id_fkey;
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_customer_id_fkey;
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_mechanic_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;