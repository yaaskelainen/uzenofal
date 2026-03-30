-- 1. Create the messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Security: Enable Row Level Security (RLS) gracefully
DO $$
BEGIN
    -- We can safely run this multiple times without error
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Check if the policy already exists to prevent "policy already exists" error
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'messages' AND policyname = 'Allow Next.js Server Operations'
    ) THEN
        CREATE POLICY "Allow Next.js Server Operations" 
        ON public.messages 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END
$$;
