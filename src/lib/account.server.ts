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

export async function loadProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return rollDay(data as ProfileRow);
}

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

export async function getAccount(userId: string) {
  const profile = await loadProfile(userId);
  const [{ data: levels }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("vip_levels").select("*").order("level"),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  return {
    profile,
    levels: levels ?? [],
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
  const profile = await loadProfile(userId);
  const { data: vip } = await supabaseAdmin
    .from("vip_levels")
    .select("*")
    .eq("level", profile.vip_level)
    .single();
  if (!vip) throw new Error("VIP level missing");

  if (profile.quant_count >= vip.daily_tasks) {
    return { status: "exhausted" as const, profile };
  }
  if (Number(profile.balance) < Number(vip.min_balance)) {
    return {
      status: "insufficient" as const,
      required: Number(vip.min_balance),
      profile,
    };
  }

  const adjust = Number((await getSetting("profit_adjust")) ?? 0);
  const min = Number(vip.min_rate);
  const max = Number(vip.max_rate);
  const rate = round2(min + Math.random() * (max - min) + adjust);
  const profit = round2((Number(profile.balance) * rate) / 100);

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

export async function submitDeposit(userId: string, amount: number, proofPath: string | null) {
  if (!(amount > 0)) throw new Error("قيمة غير صحيحة");
  const wallet = await getSetting("deposit_wallet");
  const { error } = await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    type: "deposit",
    amount: round2(amount),
    status: "pending",
    wallet_address: wallet,
    proof_path: proofPath,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function submitWithdrawal(userId: string, amount: number, wallet: string) {
  const profile = await loadProfile(userId);
  const value = round2(amount);
  if (!(value > 0)) throw new Error("قيمة غير صحيحة");
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
