-- Native, server-only memory for customer, store, and security agents.
-- Apply manually after reviewing against the target Supabase project.
CREATE TABLE IF NOT EXISTS public.grocerai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL CHECK (agent IN ('customer', 'store', 'security')),
  user_id TEXT,
  session_id TEXT,
  branch_id TEXT,
  kind TEXT NOT NULL DEFAULT 'experience',
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_document TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(kind, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grocerai_memory_scope_consistency'
      AND conrelid = 'public.grocerai_memories'::regclass
  ) THEN
    ALTER TABLE public.grocerai_memories
      ADD CONSTRAINT grocerai_memory_scope_consistency CHECK (
        (agent = 'customer' AND user_id IS NOT NULL AND branch_id IS NULL)
        OR (agent IN ('store', 'security') AND branch_id IS NOT NULL AND user_id IS NULL)
      );
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS grocerai_memories_search_idx ON public.grocerai_memories USING GIN (search_document);
CREATE INDEX IF NOT EXISTS grocerai_memories_user_scope_idx ON public.grocerai_memories (user_id, created_at DESC) WHERE agent = 'customer';
CREATE INDEX IF NOT EXISTS grocerai_memories_session_scope_idx ON public.grocerai_memories (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS grocerai_memories_agent_branch_idx ON public.grocerai_memories (agent, branch_id, created_at DESC);
ALTER TABLE public.grocerai_memories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.grocerai_memories FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.grocerai_memories TO service_role;
