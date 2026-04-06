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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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


-- ── Submissions (one row per member per week) ───────────────
CREATE TABLE public.submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  points      integer NOT NULL CHECK (points >= 0),
  note        text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (week_id, member_id)
);

-- Prevent writes to locked weeks
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


-- ── Weekly Scores View ───────────────────────────────────────
CREATE VIEW public.weekly_scores
  WITH (security_invoker = true)
AS
SELECT
  s.week_id,
  w.label      AS week_label,
  w.start_date,
  s.member_id,
  m.full_name,
  s.points     AS total_points,
  RANK() OVER (PARTITION BY s.week_id ORDER BY s.points DESC) AS rank
FROM public.submissions s
JOIN public.members m ON m.id = s.member_id
JOIN public.weeks w   ON w.id = s.week_id;


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


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


-- ── submissions policies ─────────────────────────────────────
CREATE POLICY "Admins can view all submissions"
  ON public.submissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage submissions"
  ON public.submissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
