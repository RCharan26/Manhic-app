-- Create a function to update mechanic rating after a new review
CREATE OR REPLACE FUNCTION public.update_mechanic_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating DECIMAL;
  review_count INTEGER;
BEGIN
  -- Calculate new average rating and count for the mechanic
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, review_count
  FROM public.service_ratings
  WHERE mechanic_id = NEW.mechanic_id;
  
  -- Update mechanic_details with new rating
  UPDATE public.mechanic_details
  SET 
    rating = ROUND(avg_rating, 2),
    total_reviews = review_count,
    updated_at = now()
  WHERE user_id = NEW.mechanic_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to update mechanic rating after insert
DROP TRIGGER IF EXISTS update_mechanic_rating_trigger ON public.service_ratings;
CREATE TRIGGER update_mechanic_rating_trigger
  AFTER INSERT ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mechanic_rating();