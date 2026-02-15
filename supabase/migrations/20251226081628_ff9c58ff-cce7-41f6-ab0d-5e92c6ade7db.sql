-- Create service types enum
CREATE TYPE public.service_type AS ENUM (
  'battery', 'tire', 'fuel', 'lockout', 'towing', 'other'
);

-- Create request status enum
CREATE TYPE public.request_status AS ENUM (
  'pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'
);

-- Create service requests table
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  description TEXT,
  photo_urls TEXT[],
  customer_lat DECIMAL(10, 8) NOT NULL,
  customer_lng DECIMAL(11, 8) NOT NULL,
  customer_address TEXT,
  mechanic_lat DECIMAL(10, 8),
  mechanic_lng DECIMAL(11, 8),
  status request_status NOT NULL DEFAULT 'pending',
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  eta_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service ratings table
CREATE TABLE public.service_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id)
);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;

-- Service requests policies
CREATE POLICY "Customers can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Mechanics can view assigned requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can view pending requests"
ON public.service_requests FOR SELECT
USING (status = 'pending');

CREATE POLICY "Customers can create requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their pending requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = customer_id AND status IN ('pending', 'accepted', 'en_route'));

CREATE POLICY "Mechanics can update assigned requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = mechanic_id);

-- Service ratings policies
CREATE POLICY "Users can view ratings"
ON public.service_ratings FOR SELECT
USING (true);

CREATE POLICY "Customers can create ratings for their requests"
ON public.service_ratings FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Trigger for updated_at
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();