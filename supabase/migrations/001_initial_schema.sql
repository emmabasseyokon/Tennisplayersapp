-- ============================================================
-- God's Men of Valor (GMOV) — Full Schema
-- ============================================================

-- ── Profiles (admin users only, extends auth.users) ─────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

-- Auto-create profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Members (standalone, no auth account needed) ────────────
CREATE TABLE public.members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);


-- ── Weeks ────────────────────────────────────────────────────
CREATE TABLE public.weeks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  is_locked   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);


-- ── Tasks (belong to a week) ────────────────────────────────
CREATE TABLE public.tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  name        text NOT NULL,
  points      integer NOT NULL CHECK (points > 0),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);


-- ── Task Completions (member completed a task) ──────────────
CREATE TABLE public.task_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (week_id, member_id, task_id)
);

-- Prevent writes to locked weeks (completions)
CREATE OR REPLACE FUNCTION public.check_week_not_locked()
RETURNS trigger AS $$
DECLARE locked boolean;
BEGIN
  SELECT is_locked INTO locked FROM public.weeks WHERE id = NEW.week_id;
  IF locked THEN
    RAISE EXCEPTION 'Cannot modify data for a locked week';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER completions_lock_check
  BEFORE INSERT OR UPDATE OR DELETE ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.check_week_not_locked();

-- Prevent task changes on locked weeks
CREATE OR REPLACE FUNCTION public.check_task_week_not_locked()
RETURNS trigger AS $$
DECLARE locked boolean;
  wid uuid;
BEGIN
  wid := COALESCE(NEW.week_id, OLD.week_id);
  SELECT is_locked INTO locked FROM public.weeks WHERE id = wid;
  IF locked THEN
    RAISE EXCEPTION 'Cannot modify tasks for a locked week';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER tasks_lock_check
  BEFORE INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.check_task_week_not_locked();


-- ── Weekly Scores View ───────────────────────────────────────
CREATE VIEW public.weekly_scores
  WITH (security_invoker = true)
AS
SELECT
  t.week_id,
  w.label      AS week_label,
  w.start_date,
  tc.member_id,
  m.full_name,
  COALESCE(SUM(t.points), 0)::integer AS total_points,
  RANK() OVER (
    PARTITION BY t.week_id
    ORDER BY COALESCE(SUM(t.points), 0) DESC
  ) AS rank
FROM public.task_completions tc
JOIN public.tasks t   ON t.id = tc.task_id
JOIN public.members m ON m.id = tc.member_id
JOIN public.weeks w   ON w.id = t.week_id
GROUP BY t.week_id, w.label, w.start_date, tc.member_id, m.full_name;


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';


-- ── profiles policies ────────────────────────────────────────
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());


-- ── members policies ─────────────────────────────────────────
CREATE POLICY "Admins can view all members"
  ON public.members FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage members"
  ON public.members FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── weeks policies ───────────────────────────────────────────
CREATE POLICY "Admins can view weeks"
  ON public.weeks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage weeks"
  ON public.weeks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── tasks policies ───────────────────────────────────────────
CREATE POLICY "Admins can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── task_completions policies ────────────────────────────────
CREATE POLICY "Admins can view all completions"
  ON public.task_completions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage completions"
  ON public.task_completions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
