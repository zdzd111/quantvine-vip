import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const COMMISSION_QUANT = { 1: 0.1, 2: 0.05, 3: 0.02 } as const;
export const COMMISSION_DEPOSIT = { 1: 0.05, 2: 0.03, 3: 0.01 } as const;

type ProfileRow = {
  id: string;
  username: string;
  public_id: string;
  invite_code: string;
  referred_by: string | null;
  vip_level: number;
  balance: number;
  total_revenue: number;
  today_earnings: number;
  yesterday_earnings: number;
  today_commission: number;
  quant_count: number;
  quant_date: string;
  wallet_address: string | null;
  created_at: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Rolls daily counters forward when the stored day is stale. */
export async function rollDay(profile: ProfileRow): Promise<ProfileRow> {
  const day = today();
  if (profile.quant_date === day) return profile;
  const patch = {
    quant_date: day,
    quant_count: 0,
    yesterday_earnings: profile.today_earnings,
    today_earnings: 0,
    today_commission: 0,
  };
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(patch)
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function loadProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
    
  if (error) throw new Error(error.message);
  
  // تشغيل دالة التصفير بأمان دون إجبار وتخريب البيانات
  return await rollDay(data as ProfileRow);
}



export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}


/** Counts level-1 referrals whose approved deposits total $100 or more. */
export async function getActiveInvites(userId: string): Promise<number> {
  const { data: rows } = await supabaseAdmin
    .from("referrals")
    .select("descendant_id")
    .eq("ancestor_id", userId)
    .eq("level", 1);
  const ids = (rows ?? []).map((r) => r.descendant_id);
  if (!ids.length) return 0;
  const { data: deps } = await supabaseAdmin
    .from("transactions")
    .select("user_id, amount")
    .in("user_id", ids)
    .eq("type", "deposit")
    .eq("status", "approved");
  const totals = new Map<string, number>();
  for (const d of deps ?? []) {
    totals.set(d.user_id, (totals.get(d.user_id) ?? 0) + Number(d.amount));
  }
  return [...totals.values()].filter((v) => v >= 100).length;
}

type VipRule = {
  level: number;
  daily_tasks: number;
  min_rate: number;
  max_rate: number;
  min_balance: number;
  max_balance: number;
  min_invites: number;
};

export function eligibleLevel(
  balance: number,
  activeInvites: number,
  levels: VipRule[],
): number {
  let best = 1;
  for (const rule of levels) {
    if (balance >= Number(rule.min_balance) && activeInvites >= Number(rule.min_invites ?? 0)) {
      best = Math.max(best, rule.level);
    }
  }
  return best;
}

export async function getAccount(userId: string) {
  let profile = await loadProfile(userId);
  const [{ data: levels }, { data: roles }, activeInvites] = await Promise.all([
    supabaseAdmin.from("vip_levels").select("*").order("level"),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    getActiveInvites(userId),
  ]);
  const rules = (levels ?? []) as VipRule[];
  const target = eligibleLevel(Number(profile.balance), activeInvites, rules);
  if (target !== profile.vip_level) {
    const { data: synced } = await supabaseAdmin
      .from("profiles")
      .update({ vip_level: target })
      .eq("id", userId)
      .select("*")
      .single();
    if (synced) profile = synced as ProfileRow;
  }
  return {
    profile,
    levels: rules,
    activeInvites,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    depositWallet: (await getSetting("deposit_wallet")) ?? "",
  };
}

async function payCommissions(
  userId: string,
  base: number,
  rates: Record<number, number>,
  label: string,
) {
  const { data: uplines } = await supabaseAdmin
    .from("referrals")
    .select("ancestor_id, level")
    .eq("descendant_id", userId);
  for (const up of uplines ?? []) {
    const rate = rates[up.level as 1 | 2 | 3];
    if (!rate) continue;
    const amount = round2(base * rate);
    if (amount <= 0) continue;
    const { data: anc } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", up.ancestor_id)
      .single();
    if (!anc) continue;
    const fresh = await rollDay(anc as ProfileRow);
    await supabaseAdmin
      .from("profiles")
      .update({
        balance: round2(Number(fresh.balance) + amount),
        total_revenue: round2(Number(fresh.total_revenue) + amount),
        today_commission: round2(Number(fresh.today_commission) + amount),
      })
      .eq("id", fresh.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: fresh.id,
      type: "commission",
      amount,
      status: "approved",
      note: `level${up.level}:${label}`,
    });
  }
}

export async function runQuant(userId: string) {
  const account = await getAccount(userId);
  const profile = account.profile;
  const vip = account.levels.find((l) => l.level === profile.vip_level);
  if (!vip) throw new Error("VIP level missing");

  if (Number(profile.balance) < 35) {
    return { status: "insufficient" as const, required: 35, profile };
  }

  if (profile.quant_count >= vip.daily_tasks) {
    return { status: "exhausted" as const, profile };
  }
  if (Number(profile.balance) < Number(vip.min_balance)) {
    return {
      status: "insufficient" as const,
      required: Number(vip.min_balance),
      profile,
  }

  const rate = 0.004;
  const profit = round2(Number(profile.balance) * rate);







  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({
      balance: round2(Number(profile.balance) + profit),
      total_revenue: round2(Number(profile.total_revenue) + profit),
      today_earnings: round2(Number(profile.today_earnings) + profit),
      quant_count: profile.quant_count + 1,
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    type: "quant",
    amount: profit,
    status: "approved",
    note: `rate:${rate}`,
  });

  await payCommissions(userId, profit, COMMISSION_QUANT, "quant");

  return {
    status: "ok" as const,
    profit,
    rate,
    profile: updated as ProfileRow,
    dailyTasks: vip.daily_tasks,
  };
}

export async function submitDeposit(
  userId: string,
  amount: number,
  network: "trc20" | "bep20",
) {
  if (!(amount > 0)) throw new Error("قيمة غير صحيحة");
  const wallet = await getSetting(`deposit_wallet_${network}`);
  const { error } = await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    type: "deposit",
    amount: round2(amount),
    status: "pending",
    wallet_address: wallet,
    note: `network:${network}`,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function submitWithdrawal(
  userId: string,
  amount: number,
  wallet: string,
  network: "trc20" | "bep20" = "trc20",
) {
  const profile = await loadProfile(userId);
  const value = round2(amount);
  if (!(value >= 10)) return { ok: false as const, reason: "min" as const };
  if (value > Number(profile.balance)) {
    return { ok: false as const, reason: "insufficient" as const };
  }
  if (!wallet || wallet.trim().length < 20) {
    return { ok: false as const, reason: "wallet" as const };
  }
  await supabaseAdmin
    .from("profiles")
    .update({
      balance: round2(Number(profile.balance) - value),
      wallet_address: wallet.trim(),
    })
    .eq("id", userId);
  const { error } = await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    type: "withdrawal",
    amount: value,
    status: "pending",
    wallet_address: wallet.trim(),
    note: `network:${network}`,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function getTeam(userId: string) {
  const profile = await loadProfile(userId);
  const { data: rows } = await supabaseAdmin
    .from("referrals")
    .select("descendant_id, level")
    .eq("ancestor_id", userId);
  const { data: commissions } = await supabaseAdmin
    .from("transactions")
    .select("amount, note")
    .eq("user_id", userId)
    .eq("type", "commission");

  const levels = await Promise.all(
    [1, 2, 3].map(async (level) => {
      const ids = (rows ?? []).filter((r) => r.level === level).map((r) => r.descendant_id);
      let deposits = 0;
      let active = 0;
      if (ids.length) {
        const { data: members } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .in("id", ids);
        active = (members ?? []).filter((m) => Number(m.balance) > 0).length;
        const { data: dep } = await supabaseAdmin
          .from("transactions")
          .select("amount")
          .in("user_id", ids)
          .eq("type", "deposit")
          .eq("status", "approved");
        deposits = round2((dep ?? []).reduce((s, d) => s + Number(d.amount), 0));
      }
      const commission = round2(
        (commissions ?? [])
          .filter((c) => (c.note ?? "").startsWith(`level${level}:`))
          .reduce((s, c) => s + Number(c.amount), 0),
      );
      return { level, members: ids.length, active, deposits, commission };
    }),
  );

  const totalCommission = round2(
    (commissions ?? []).reduce((s, c) => s + Number(c.amount), 0),
  );

  return {
    inviteCode: profile.invite_code,
    activeInvites: await getActiveInvites(userId),
    balance: Number(profile.balance),
    vipLevel: profile.vip_level,
    todayCommission: Number(profile.today_commission),
    totalCommission,
    levels,
  };
}

export async function getTransactions(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProofUploadPath(userId: string, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
  return `${userId}/${Date.now()}-${safe}`;
}
