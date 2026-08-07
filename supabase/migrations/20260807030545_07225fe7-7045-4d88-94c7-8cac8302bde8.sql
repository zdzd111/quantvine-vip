-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- VIP LEVELS
CREATE TABLE public.vip_levels (
  level int PRIMARY KEY,
  daily_tasks int NOT NULL,
  min_rate numeric(6,4) NOT NULL,
  max_rate numeric(6,4) NOT NULL,
  min_balance numeric(14,2) NOT NULL,
  max_balance numeric(14,2) NOT NULL
);
GRANT SELECT ON public.vip_levels TO anon;
GRANT SELECT ON public.vip_levels TO authenticated;
GRANT ALL ON public.vip_levels TO service_role;
ALTER TABLE public.vip_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vip levels public" ON public.vip_levels FOR SELECT USING (true);
CREATE POLICY "admins manage vip" ON public.vip_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.vip_levels (level, daily_tasks, min_rate, max_rate, min_balance, max_balance) VALUES
  (1, 5, 1.80, 2.10, 35, 500),
  (2, 6, 2.30, 2.60, 300, 2000),
  (3, 7, 2.80, 3.10, 1000, 5000);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT 'user',
  public_id text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vip_level int NOT NULL DEFAULT 1 REFERENCES public.vip_levels(level),
  balance numeric(14,2) NOT NULL DEFAULT 0,
  total_revenue numeric(14,2) NOT NULL DEFAULT 0,
  today_earnings numeric(14,2) NOT NULL DEFAULT 0,
  yesterday_earnings numeric(14,2) NOT NULL DEFAULT 0,
  today_commission numeric(14,2) NOT NULL DEFAULT 0,
  quant_count int NOT NULL DEFAULT 0,
  quant_date date NOT NULL DEFAULT CURRENT_DATE,
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins select profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- REFERRAL TREE
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ancestor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ancestor_id, descendant_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own team select" ON public.referrals FOR SELECT TO authenticated USING (ancestor_id = auth.uid() OR descendant_id = auth.uid());
CREATE POLICY "admins select referrals" ON public.referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit','withdrawal','quant','commission','adjustment')),
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  wallet_address text,
  proof_path text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins select tx" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage tx" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX transactions_user_idx ON public.transactions (user_id, created_at DESC);
CREATE INDEX transactions_status_idx ON public.transactions (status, type);

-- SETTINGS
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings readable" ON public.app_settings FOR SELECT USING (is_public);
CREATE POLICY "admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('deposit_wallet', 'TVm2QmKP95GKM9NndgqWkRkTJR8ZVks7K9'),
  ('profit_adjust', '0');

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_pid text;
  v_ref uuid;
BEGIN
  LOOP
    v_pid := lpad((floor(random()*90000000)+10000000)::bigint::text, 8, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_id = v_pid);
  END LOOP;
  LOOP
    v_code := upper(substr(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_code);
  END LOOP;

  SELECT id INTO v_ref FROM public.profiles
  WHERE invite_code = upper(coalesce(NEW.raw_user_meta_data->>'invite_code',''))
  LIMIT 1;

  INSERT INTO public.profiles (id, username, public_id, invite_code, referred_by)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_pid, v_code, v_ref
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF v_ref IS NOT NULL THEN
    INSERT INTO public.referrals (ancestor_id, descendant_id, level)
    VALUES (v_ref, NEW.id, 1) ON CONFLICT DO NOTHING;
    INSERT INTO public.referrals (ancestor_id, descendant_id, level)
    SELECT r.ancestor_id, NEW.id, r.level + 1
    FROM public.referrals r
    WHERE r.descendant_id = v_ref AND r.level + 1 <= 3
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER transactions_touch BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();