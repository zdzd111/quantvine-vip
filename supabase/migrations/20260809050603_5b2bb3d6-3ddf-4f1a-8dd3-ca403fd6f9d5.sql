ALTER TABLE public.vip_levels ADD COLUMN IF NOT EXISTS min_invites integer NOT NULL DEFAULT 0;

UPDATE public.vip_levels SET daily_tasks = 5, min_rate = 1.8, max_rate = 2.1, min_balance = 35, max_balance = 199.99, min_invites = 0 WHERE level = 1;
UPDATE public.vip_levels SET daily_tasks = 6, min_rate = 2.5, max_rate = 3.0, min_balance = 200, max_balance = 499.99, min_invites = 3 WHERE level = 2;
UPDATE public.vip_levels SET daily_tasks = 7, min_rate = 3.5, max_rate = 4.2, min_balance = 500, max_balance = 100000000, min_invites = 6 WHERE level = 3;

INSERT INTO public.app_settings (key, value, is_public)
VALUES ('deposit_wallet_trc20', 'TViGZNqLGyULeNik7DfBp3sMKRM8j7jfpH', true),
       ('deposit_wallet_bep20', '0xEC2FB4d9C88F36Fc59dBaEF69beb4a8C44209930', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_public = true;

UPDATE public.app_settings SET value = 'TViGZNqLGyULeNik7DfBp3sMKRM8j7jfpH' WHERE key = 'deposit_wallet';