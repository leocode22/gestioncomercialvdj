-- ============================================================
-- VivirdeDJ — Gestión Comercial · Schema SQL
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- USERS
-- Perfil extendido vinculado a auth.users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden leer todos los perfiles (necesario para leaderboard)
CREATE POLICY "Users can read all profiles" ON public.users
  FOR SELECT USING (true);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- El sistema puede insertar perfiles (trigger)
CREATE POLICY "System can insert profiles" ON public.users
  FOR INSERT WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- Trigger: crear perfil automáticamente al registrarse
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- OBJECTIVES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.objectives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  kpi_type      TEXT NOT NULL,
  target_value  NUMERIC NOT NULL CHECK (target_value > 0),
  period        TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')) DEFAULT 'monthly',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  assigned_to   TEXT NOT NULL DEFAULT 'team',  -- 'team' o user UUID
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage objectives" ON public.objectives
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees read their objectives" ON public.objectives
  FOR SELECT USING (
    assigned_to = 'team' OR assigned_to = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- KPI_ENTRIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kpi_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  objective_id  UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  value         NUMERIC NOT NULL CHECK (value > 0),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own KPI entries" ON public.kpi_entries
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins read all KPI entries" ON public.kpi_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- POINT_RULES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.point_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name  TEXT NOT NULL,
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage point rules" ON public.point_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Employees read point rules" ON public.point_rules
  FOR SELECT USING (true);


-- ─────────────────────────────────────────────────────────────
-- REWARDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  points_cost  INTEGER NOT NULL CHECK (points_cost > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rewards" ON public.rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Everyone reads rewards" ON public.rewards
  FOR SELECT USING (true);


-- ─────────────────────────────────────────────────────────────
-- POINT_TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points     INTEGER NOT NULL,  -- puede ser negativo (canje)
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions" ON public.point_transactions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System inserts transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- REWARD_REDEMPTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id   UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own redemptions" ON public.reward_redemptions
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- DATOS DE EJEMPLO (opcional, descomenta para usar)
-- ─────────────────────────────────────────────────────────────

-- Reglas de puntos por defecto
INSERT INTO public.point_rules (action_name, points_value) VALUES
  ('Cerrar un deal',         100),
  ('Agendar una demo',        25),
  ('Hacer 10 llamadas',       10),
  ('Enviar propuesta',        15),
  ('Follow-up completado',     5),
  ('Superar target mensual', 200)
ON CONFLICT DO NOTHING;

-- Recompensas de ejemplo
INSERT INTO public.rewards (name, description, points_cost) VALUES
  ('Café con el CEO',        'Una hora de mentoring 1:1 con el founder', 200),
  ('Día libre extra',        'Un día de descanso adicional pagado',       500),
  ('Bonus en efectivo 50€',  'Transferencia directa de 50€',            1000),
  ('Formación premium',      'Acceso a un curso de tu elección',         300),
  ('Gift card Amazon 25€',   'Tarjeta regalo para lo que quieras',       250)
ON CONFLICT DO NOTHING;
