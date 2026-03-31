-- Simplify submissions: remove task dependency, one row per member per week
-- Run this AFTER 001 and 002.

-- 1. Drop the view that depends on submissions (must go first)
DROP VIEW IF EXISTS public.weekly_scores;

-- 2. Drop the lock trigger
DROP TRIGGER IF EXISTS submissions_lock_check ON public.submissions;
DROP FUNCTION IF EXISTS public.check_week_not_locked();

-- 3. Drop old submissions (task-based) and recreate simplified
DROP TABLE IF EXISTS public.submissions;

CREATE TABLE public.submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points      integer NOT NULL CHECK (points >= 0),
  note        text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (week_id, member_id)
);

-- 4. Recreate lock trigger on simplified table
CREATE OR REPLACE FUNCTION public.check_week_not_locked()
RETURNS trigger AS $$
DECLARE locked boolean;
BEGIN
  SELECT is_locked INTO locked FROM public.weeks WHERE id = NEW.week_id;
  IF locked THEN
    RAISE EXCEPTION 'Cannot modify submissions for a locked week';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submissions_lock_check
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.check_week_not_locked();

-- 5. Re-enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own submissions"
  ON public.submissions FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
  ON public.submissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage submissions"
  ON public.submissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Drop tasks table
DROP TABLE IF EXISTS public.tasks;

-- 7. Recreate weekly_scores view (no task join needed)
DROP VIEW IF EXISTS public.weekly_scores;

CREATE VIEW public.weekly_scores
  WITH (security_invoker = true)
AS
SELECT
  s.week_id,
  w.label      AS week_label,
  w.start_date,
  s.member_id,
  p.full_name,
  s.points     AS total_points,
  RANK() OVER (PARTITION BY s.week_id ORDER BY s.points DESC) AS rank
FROM public.submissions s
JOIN public.profiles p ON p.id = s.member_id
JOIN public.weeks w    ON w.id = s.week_id;
