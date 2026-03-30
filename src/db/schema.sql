-- Run this in your Supabase SQL Editor once to set up the messages table

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- security: Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- security: Open access for the public board (server-side only)
CREATE POLICY "Allow Next.js Server Operations" 
ON public.messages 
FOR ALL 
USING (true) 
WITH CHECK (true);
