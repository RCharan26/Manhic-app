-- Add business location fields to mechanic_details table

ALTER TABLE public.mechanic_details
ADD COLUMN IF NOT EXISTS business_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS business_lng DECIMAL(11,8);
