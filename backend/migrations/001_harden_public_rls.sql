-- Harden public schema access for the deployed app.
-- Browser access is only needed for user_profiles; application data is served
-- through the authenticated Railway backend using the Supabase service role.

-- Do not expose the signup trigger helper as a callable REST RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Remove broad table privileges granted to browser-facing roles.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Keep profile reads and limited profile updates available to signed-in users.
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE (
  display_name,
  organisation,
  tabular_model,
  claude_api_key,
  gemini_api_key,
  message_credits_used,
  credits_reset_date,
  updated_at
) ON public.user_profiles TO authenticated;

-- Avoid accidentally granting browser roles access to future public tables.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

-- RLS must be enabled for every table in the exposed public schema.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subfolders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabular_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabular_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabular_review_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabular_review_chat_messages ENABLE ROW LEVEL SECURITY;

-- Keep the only browser-facing table policy explicit and efficient.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Missing foreign-key indexes reported by the Supabase performance advisor.
CREATE INDEX IF NOT EXISTS documents_current_version_id_idx
  ON public.documents(current_version_id);

CREATE INDEX IF NOT EXISTS documents_folder_id_idx
  ON public.documents(folder_id);

CREATE INDEX IF NOT EXISTS project_subfolders_parent_folder_id_idx
  ON public.project_subfolders(parent_folder_id);

CREATE INDEX IF NOT EXISTS tabular_cells_document_id_idx
  ON public.tabular_cells(document_id);

CREATE INDEX IF NOT EXISTS tabular_reviews_workflow_id_idx
  ON public.tabular_reviews(workflow_id);
