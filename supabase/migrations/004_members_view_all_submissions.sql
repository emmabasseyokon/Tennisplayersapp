-- Allow members to see all submissions (not just their own)
-- so the weekly_scores view shows full rankings for everyone.
DROP POLICY "Members can view own submissions" ON public.submissions;

CREATE POLICY "Members can view all submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);
