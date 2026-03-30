-- ============================================================
-- God's Men of Valor (GMOV) — Initial Schema
-- ============================================================

-- ── Profiles (extends auth.users) ───────────────────────────
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Tasks ────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  points       integer NOT NULL CHECK (points > 0),
  is_active    boolean DEFAULT true,
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
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


-- ── Submissions ──────────────────────────────────────────────
CREATE TABLE public.submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id      uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id      uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  points       integer NOT NULL,
  recorded_by  uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (week_id, member_id, task_id)
);

-- Prevent writes to locked weeks
CREATE OR REPLACE FUNCTION public.check_week_not_locked()
RETURNS trigger AS $$
DECLARE
  locked boolean;
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


-- ── Announcements ────────────────────────────────────────────
CREATE TABLE public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text NOT NULL,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now()
);


-- ── Weekly Scores View ───────────────────────────────────────
CREATE VIEW public.weekly_scores AS
SELECT
  s.week_id,
  w.label   AS week_label,
  w.start_date,
  s.member_id,
  p.full_name,
  SUM(s.points) AS total_points,
  RANK() OVER (PARTITION BY s.week_id ORDER BY SUM(s.points) DESC) AS rank
FROM public.submissions s
JOIN public.profiles p ON p.id = s.member_id
JOIN public.weeks w ON w.id = s.week_id
GROUP BY s.week_id, w.label, w.start_date, s.member_id, p.full_name;


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── profiles policies ────────────────────────────────────────
CREATE POLICY "Members can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());


-- ── tasks policies ───────────────────────────────────────────
CREATE POLICY "Members can view active tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_admin());


-- ── weeks policies ───────────────────────────────────────────
CREATE POLICY "Anyone authenticated can view weeks"
  ON public.weeks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage weeks"
  ON public.weeks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── submissions policies ─────────────────────────────────────
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


-- ── announcements policies ───────────────────────────────────
CREATE POLICY "Anyone authenticated can view announcements"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- Seed: Sample tasks (optional, remove before production)
-- ============================================================
-- INSERT INTO public.tasks (name, description, points) VALUES
--   ('Attended Service',      'Present at weekly Sunday service',       10),
--   ('Led Devotion',          'Led the group devotion session',         20),
--   ('Completed Assignment',  'Submitted the weekly reading/assignment', 15),
--   ('Invited a Guest',       'Brought a visitor to the group',         25),
--   ('Prayer Attendance',     'Attended mid-week prayer meeting',       10);
