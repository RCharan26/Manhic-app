-- Create messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX messages_request_id_created_at_idx 
ON public.messages(request_id, created_at);

-- Enable replication for realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Set up RLS policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reads if user is a participant in the request and request is accepted
CREATE POLICY "Allow reading messages for accepted requests"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_requests sr
    WHERE sr.id = messages.request_id
    AND sr.status = 'accepted'
    AND (sr.customer_id = auth.uid() OR sr.mechanic_id = auth.uid())
  )
);

-- Policy: Allow inserts if user is a participant and request is accepted
CREATE POLICY "Allow inserting messages for accepted requests"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_requests sr
    WHERE sr.id = request_id
    AND sr.status = 'accepted'
    AND (sr.customer_id = auth.uid() OR sr.mechanic_id = auth.uid())
  )
);

-- Disable RLS enforcement since we're using Clerk JWT validation in Edge Functions
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
