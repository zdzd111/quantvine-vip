-- 1) profiles: new fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS total_team_deposit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withdraw_pin_hash text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_agent text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (lower(email)) WHERE email IS NOT NULL;

UPDATE public.profiles p
SET email = u.email,
    full_name = COALESCE(p.full_name, p.username)
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- 2) in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE TRIGGER notifications_touch BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) signup trigger stores email + full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.profiles (id, username, public_id, invite_code, referred_by, email, full_name)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    v_pid, v_code, v_ref,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
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
$function$;

-- 4) default announcement banner text
INSERT INTO public.app_settings (key, value, is_public)
VALUES ('announcement', 'مرحباً بك في Quantvine · أرباح التكميم اليومية تتجدد الساعة 11:00 صباحاً · معالجة السحب من 24 إلى 48 ساعة عمل', true)
ON CONFLICT (key) DO NOTHING;