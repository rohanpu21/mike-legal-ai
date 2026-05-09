-- Backend-only tables should remain inaccessible through browser Supabase
-- clients even if table privileges are accidentally granted later.

CREATE POLICY "No browser access"
  ON public.projects
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.project_subfolders
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.documents
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.document_versions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.document_edits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.workflows
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.hidden_workflows
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.workflow_shares
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.chats
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.chat_messages
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.tabular_reviews
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.tabular_cells
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.tabular_review_chats
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No browser access"
  ON public.tabular_review_chat_messages
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
