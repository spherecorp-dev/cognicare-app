-- ============================================================================
-- CogniCare Protocol — Supabase Schema
-- ============================================================================

-- 1. PROFILES
-- Extends auth.users with app-specific data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  purchased_tiers TEXT[] NOT NULL DEFAULT ARRAY['protocol']::TEXT[],
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_week SMALLINT NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 8),
  brain_score SMALLINT NOT NULL DEFAULT 60 CHECK (brain_score BETWEEN 0 AND 100),
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  brain_fog_baseline SMALLINT CHECK (brain_fog_baseline BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. COMPLETED TASKS
-- Tracks which weekly protocol tasks a user has completed
CREATE TABLE public.completed_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

-- 3. PREPARED RECIPES
-- Tracks which brain recipes a user has prepared
CREATE TABLE public.prepared_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

-- 4. DAILY CHECKINS
-- Tracks daily protocol adherence for streak calculation
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_completed_tasks_user ON public.completed_tasks(user_id);
CREATE INDEX idx_prepared_recipes_user ON public.prepared_recipes(user_id);
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, checkin_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prepared_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Completed tasks
CREATE POLICY "Users can view own tasks"
  ON public.completed_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.completed_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.completed_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Prepared recipes
CREATE POLICY "Users can view own recipes"
  ON public.prepared_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.prepared_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.prepared_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Daily checkins
CREATE POLICY "Users can view own checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
