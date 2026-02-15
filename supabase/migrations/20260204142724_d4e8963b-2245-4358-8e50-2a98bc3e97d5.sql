-- Insert test mechanic profiles
INSERT INTO public.profiles (user_id, role, full_name, phone)
VALUES 
  ('test_mechanic_001', 'mechanic', 'Ravi Kumar - Quick Fix', '+91-9876543210'),
  ('test_mechanic_002', 'mechanic', 'Suresh Auto Services', '+91-9876543211')
ON CONFLICT (user_id) DO NOTHING;

-- Insert user roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('test_mechanic_001', 'mechanic'),
  ('test_mechanic_002', 'mechanic')
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert mechanic details with Hyderabad locations
INSERT INTO public.mechanic_details (
  user_id, business_name, license_number, years_experience, 
  service_radius_km, specializations, is_available, is_verified,
  current_lat, current_lng, rating, total_reviews
)
VALUES 
  ('test_mechanic_001', 'Quick Fix Auto Services', 'MH-AUTO-12345', 8, 
   30, ARRAY['Battery', 'Tire Change', 'Jump Start', 'Fuel Delivery'], true, true,
   17.4210, 78.6580, 4.7, 156),
  ('test_mechanic_002', 'Suresh Roadside Help', 'MH-AUTO-67890', 5, 
   25, ARRAY['Towing', 'Lockout', 'Engine Repair'], true, true,
   17.4350, 78.6720, 4.5, 89)
ON CONFLICT (user_id) DO NOTHING;