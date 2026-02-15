-- Fix SECURITY DEFINER functions with proper input validation

-- Drop and recreate find_nearby_mechanics with coordinate validation
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
  -- Validate coordinate ranges
  IF customer_lat IS NULL OR customer_lng IS NULL THEN
    RAISE EXCEPTION 'Coordinates cannot be null';
  END IF;
  
  IF customer_lat < -90 OR customer_lat > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90 degrees';
  END IF;
  
  IF customer_lng < -180 OR customer_lng > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180 degrees';
  END IF;
  
  -- Validate max_distance_km is reasonable (between 1 and 500 km)
  IF max_distance_km IS NULL OR max_distance_km < 1 OR max_distance_km > 500 THEN
    max_distance_km := 50; -- Default to 50km if invalid
  END IF;

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
  ORDER BY distance_km ASC
  LIMIT 20; -- Limit results to prevent excessive data exposure
END;
$$;

-- Drop and recreate assign_mechanic_to_request with comprehensive validation
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
  request_record RECORD;
  distance DECIMAL;
  eta INTEGER;
  max_assignment_distance DECIMAL := 100; -- Maximum 100km for assignment
BEGIN
  -- Validate input parameters
  IF request_id IS NULL OR mechanic_user_id IS NULL THEN
    RAISE EXCEPTION 'Request ID and Mechanic User ID cannot be null';
  END IF;

  -- Check if request exists and is in pending status
  SELECT id, status, customer_lat, customer_lng, mechanic_id
  INTO request_record
  FROM public.service_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request not found';
  END IF;
  
  IF request_record.status != 'pending' THEN
    RETURN FALSE; -- Request is no longer pending, silently fail
  END IF;
  
  IF request_record.mechanic_id IS NOT NULL THEN
    RETURN FALSE; -- Already assigned to a mechanic
  END IF;

  -- Get mechanic's current location and verify availability
  SELECT current_lat, current_lng, is_available, is_verified 
  INTO mechanic_location
  FROM public.mechanic_details
  WHERE user_id = mechanic_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mechanic not found';
  END IF;
  
  IF NOT mechanic_location.is_available THEN
    RETURN FALSE; -- Mechanic is not available
  END IF;
  
  IF NOT mechanic_location.is_verified THEN
    RETURN FALSE; -- Mechanic is not verified
  END IF;
  
  IF mechanic_location.current_lat IS NULL OR mechanic_location.current_lng IS NULL THEN
    RETURN FALSE; -- Mechanic location not available
  END IF;
  
  -- Calculate distance between mechanic and customer
  distance := public.calculate_distance_km(
    request_record.customer_lat, request_record.customer_lng,
    mechanic_location.current_lat, mechanic_location.current_lng
  );
  
  -- Validate mechanic is within reasonable distance
  IF distance > max_assignment_distance THEN
    RETURN FALSE; -- Mechanic is too far away
  END IF;
  
  -- Calculate ETA (assuming 30 km/h average speed in traffic)
  eta := CEIL((distance / 30) * 60); -- Convert to minutes
  IF eta < 5 THEN eta := 5; END IF; -- Minimum 5 minutes
  IF eta > 180 THEN eta := 180; END IF; -- Maximum 3 hours
  
  -- Update the service request atomically
  UPDATE public.service_requests
  SET 
    mechanic_id = mechanic_user_id,
    mechanic_lat = mechanic_location.current_lat,
    mechanic_lng = mechanic_location.current_lng,
    status = 'accepted',
    eta_minutes = eta,
    updated_at = now()
  WHERE id = request_id 
    AND status = 'pending'
    AND mechanic_id IS NULL; -- Double-check no race condition
  
  RETURN FOUND;
END;
$$;