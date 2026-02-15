-- Add current location columns to mechanic_details
ALTER TABLE public.mechanic_details 
ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- Enable real-time on mechanic_details for location updates
ALTER TABLE public.mechanic_details REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_details;

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r DECIMAL := 6371; -- Earth's radius in km
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$;

-- Create function to find nearby available mechanics
CREATE OR REPLACE FUNCTION public.find_nearby_mechanics(
  customer_lat DECIMAL,
  customer_lng DECIMAL,
  max_distance_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  mechanic_id UUID,
  user_id UUID,
  business_name TEXT,
  rating DECIMAL,
  total_reviews INTEGER,
  distance_km DECIMAL,
  current_lat DECIMAL,
  current_lng DECIMAL,
  specializations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    md.id as mechanic_id,
    md.user_id,
    md.business_name,
    md.rating,
    md.total_reviews,
    public.calculate_distance_km(customer_lat, customer_lng, md.current_lat, md.current_lng) as distance_km,
    md.current_lat,
    md.current_lng,
    md.specializations
  FROM public.mechanic_details md
  WHERE md.is_available = true
    AND md.is_verified = true
    AND md.current_lat IS NOT NULL
    AND md.current_lng IS NOT NULL
    AND public.calculate_distance_km(customer_lat, customer_lng, md.current_lat, md.current_lng) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$;

-- Create function to assign mechanic to request
CREATE OR REPLACE FUNCTION public.assign_mechanic_to_request(
  request_id UUID,
  mechanic_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mechanic_location RECORD;
  distance DECIMAL;
  eta INTEGER;
BEGIN
  -- Get mechanic's current location
  SELECT current_lat, current_lng INTO mechanic_location
  FROM public.mechanic_details
  WHERE user_id = mechanic_user_id AND is_available = true;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate distance and ETA (assuming 30 km/h average speed in traffic)
  SELECT public.calculate_distance_km(
    sr.customer_lat, sr.customer_lng,
    mechanic_location.current_lat, mechanic_location.current_lng
  ) INTO distance
  FROM public.service_requests sr
  WHERE sr.id = request_id;
  
  eta := CEIL((distance / 30) * 60); -- Convert to minutes
  IF eta < 5 THEN eta := 5; END IF; -- Minimum 5 minutes
  
  -- Update the service request
  UPDATE public.service_requests
  SET 
    mechanic_id = mechanic_user_id,
    mechanic_lat = mechanic_location.current_lat,
    mechanic_lng = mechanic_location.current_lng,
    status = 'accepted',
    eta_minutes = eta,
    updated_at = now()
  WHERE id = request_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Policy to allow mechanics to update their own location
CREATE POLICY "Mechanics can update their location"
ON public.mechanic_details FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);