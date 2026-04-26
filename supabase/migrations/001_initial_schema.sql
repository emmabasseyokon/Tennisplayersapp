-- ============================================================
-- Tennis Players Database — initial schema
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


-- ── Players ─────────────────────────────────────────────────
CREATE TABLE public.players (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text NOT NULL,
  date_of_birth     date NOT NULL,
  gender            text NOT NULL CHECK (gender IN ('male','female')),
  dob_document_url  text,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT players_dob_not_future CHECK (date_of_birth <= current_date),
  CONSTRAINT players_dob_plausible  CHECK (date_of_birth >= '1950-01-01')
);

CREATE INDEX players_dob_idx    ON public.players (date_of_birth);
CREATE INDEX players_gender_idx ON public.players (gender);


-- ── Helper: age in whole years at a given reference date ────
CREATE OR REPLACE FUNCTION public.age_years(dob date, ref date DEFAULT current_date)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT extract(year FROM age(ref, dob))::int
$$;


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players  ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';


-- ── profiles policies ───────────────────────────────────────
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());


-- ── players policies ────────────────────────────────────────
CREATE POLICY "Admins can view all players"
  ON public.players FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- Storage: DOB documents (passport / birth certificate scans)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('dob-documents', 'dob-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read DOB documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dob-documents' AND public.is_admin());

CREATE POLICY "Admins can upload DOB documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dob-documents' AND public.is_admin());

CREATE POLICY "Admins can update DOB documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dob-documents' AND public.is_admin());

CREATE POLICY "Admins can delete DOB documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dob-documents' AND public.is_admin());
