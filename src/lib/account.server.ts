import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const COMMISSION_QUANT = { 1: 0.1, 2: 0.05, 3: 0.02 } as const;
export const COMMISSION_DEPOSIT = { 1: 0.05, 2: 0.03, 3: 0.01 } as const;

/** Daily tasks reset at 11:00 local server time. */
export const RESET_HOUR = 11;

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
  email?: string | null;
  full_name?: string | null;
  total_team_deposit?: number | null;
  withdraw_pin_hash?: string | null;
  last_login_at?: string | null;
  last_login_agent?: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The "trading day" a moment belongs to, where a new day starts at 11:00. */
export function tradingDay(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() - RESET_HOUR * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

export const hashPin = (pin: string) =>
  createHash("sha256").update(`qv:${pin.trim()}`).digest("hex");

export async function notify(
  userId: string,
  title: string,
  body: string,
  kind: "deposit" | "withdrawal" | "quant" | "commission" | "info" = "info",
) {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, kind });
}

/** Rolls daily counters forward when the stored trading day is stale. */
export async function rollDay(profile: ProfileRow): Promise<ProfileRow> {
  const day = tradingDay();
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

/** Approved deposit totals per user id. */
async function depositTotals(ids: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!ids.length) return totals;
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("user_id, amount")
    .in("user_id", ids)
    .eq("type", "deposit")
    .eq("status", "approved");
  for (const row of data ?? []) {
    totals.set(row.user_id, round2((totals.get(row.user_id) ?? 0) + Number(row.amount)));
  }
  return totals;
}

/** Counts level-1 referrals whose approved deposits total $100 or more. */
export async function getActiveInvites(userId: string): Promise<number> {
  const { data: rows } = await supabaseAdmin
    .from("referrals")
    .select("descendant_id")
    .eq("ancestor_id", userId)
    .eq("level", 1);
  const ids = (rows ?? []).map((r) => r.descendant_id);
  const totals = await depositTotals(ids);
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

/** Highest level whose balance AND active-invite requirements are both met. */
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
  const [{ data: levels }, { data: roles }, activeInvites, pending, announcement] =
    await Promise.all([
      supabaseAdmin.from("vip_levels").select("*").order("level"),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      getActiveInvites(userId),
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "withdrawal")
        .eq("status", "pending"),
      getSetting("announcement"),
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
    hasWithdrawPin: Boolean(profile.withdraw_pin_hash),
    pendingWithdrawals: pending.count ?? 0,
    announcement: announcement ?? "",
    resetHour: RESET_HOUR,
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
    await notify(
      fresh.id,
      "عمولة فريق جديدة",
      `تم إضافة عمولة بقيمة $${amount} من المستوى ${up.level} إلى رصيدك.`,
      "commission",
    );
  }
}

export async function runQuant(userId: string) {
  const account = await getAccount(userId);
  const profile = account.profile;
  const vip = account.levels.find((l) => l.level === profile.vip_level);
  if (!vip) throw new Error("VIP level missing");

  const balance = Number(profile.balance);
  if (balance < 35) {
    return { status: "insufficient" as const, required: 35, profile };
  }
  if (profile.quant_count >= vip.daily_tasks) {
    return { status: "exhausted" as const, profile };
  }
  if (balance < Number(vip.min_balance)) {
    return { status: "insufficient" as const, required: Number(vip.min_balance), profile };
  }

  // Daily rate (percent) inside the VIP band, plus the global admin adjustment.
  const min = Number(vip.min_rate);
  const max = Number(vip.max_rate);
  const adjust = Number((await getSetting("profit_adjust")) ?? 0) || 0;
  const dailyPercent = Math.max(0, min + Math.random() * Math.max(0, max - min) + adjust);
  const tasks = Math.max(1, Number(vip.daily_tasks));
  const profit = round2((balance * (dailyPercent / 100)) / tasks);

  const { data: updated, error } = await supabaseAdmin
    .from("profiles")
    .update({
      balance: round2(balance + profit),
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
    note: `rate:${dailyPercent.toFixed(2)}%`,
  });

  await notify(
    userId,
    "تم إكمال مهمة تكميم",
    `ربحت $${profit} من مهمة التكميم (${profile.quant_count + 1}/${tasks}).`,
    "quant",
  );

  await payCommissions(userId, profit, COMMISSION_QUANT, "quant");

  return {
    status: "ok" as const,
    profit,
    rate: round2(dailyPercent),
    profile: updated as ProfileRow,
    dailyTasks: tasks,
    used: profile.quant_count + 1,
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
  await notify(
    userId,
    "طلب تعبئة رصيد",
    `تم استلام طلب تعبئة بقيمة $${round2(amount)} وهو قيد المراجعة.`,
    "deposit",
  );
  return { ok: true };
}

export async function setWithdrawPin(userId: string, pin: string, currentPin?: string) {
  const profile = await loadProfile(userId);
  if (profile.withdraw_pin_hash && profile.withdraw_pin_hash !== hashPin(currentPin ?? "")) {
    return { ok: false as const, reason: "wrong_pin" as const };
  }
  if (!/^\d{4,6}$/.test(pin.trim())) return { ok: false as const, reason: "format" as const };
  await supabaseAdmin
    .from("profiles")
    .update({ withdraw_pin_hash: hashPin(pin) })
    .eq("id", userId);
  await notify(userId, "تحديث أمان الحساب", "تم تحديث رمز أمان السحب بنجاح.", "info");
  return { ok: true as const };
}

export async function submitWithdrawal(
  userId: string,
  amount: number,
  wallet: string,
  network: "trc20" | "bep20" = "trc20",
  pin?: string,
) {
  const profile = await loadProfile(userId);
  const value = round2(amount);
  if (!(value >= 10)) return { ok: false as const, reason: "min" as const };
  if (!wallet || wallet.trim().length < 20) {
    return { ok: false as const, reason: "wallet" as const };
  }
  if (profile.withdraw_pin_hash) {
    if (!pin || hashPin(pin) !== profile.withdraw_pin_hash) {
      return { ok: false as const, reason: "pin" as const };
    }
  }
  const { count: pending } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "withdrawal")
    .eq("status", "pending");
  if ((pending ?? 0) > 0) return { ok: false as const, reason: "pending" as const };
  if (value > Number(profile.balance)) {
    return { ok: false as const, reason: "insufficient" as const };
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
  await notify(
    userId,
    "طلب سحب",
    `تم استلام طلب سحب بقيمة $${value} وسيُعالج خلال 24 إلى 48 ساعة عمل.`,
    "withdrawal",
  );
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
    .in("type", ["commission"]);

  const levels = await Promise.all(
    [1, 2, 3].map(async (level) => {
      const ids = (rows ?? []).filter((r) => r.level === level).map((r) => r.descendant_id);
      const totals = await depositTotals(ids);
      const deposits = round2([...totals.values()].reduce((s, v) => s + v, 0));
      const active = [...totals.values()].filter((v) => v >= 100).length;
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
  const teamDeposits = round2(levels.reduce((s, l) => s + l.deposits, 0));
  const teamMembers = levels.reduce((s, l) => s + l.members, 0);

  if (round2(Number(profile.total_team_deposit ?? 0)) !== teamDeposits) {
    await supabaseAdmin
      .from("profiles")
      .update({ total_team_deposit: teamDeposits })
      .eq("id", userId);
  }

  return {
    inviteCode: profile.invite_code,
    activeInvites: await getActiveInvites(userId),
    balance: Number(profile.balance),
    vipLevel: profile.vip_level,
    todayCommission: Number(profile.today_commission),
    totalCommission,
    teamDeposits,
    teamMembers,
    directMembers: levels[0]?.members ?? 0,
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

export async function getNotifications(userId: string) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  const items = data ?? [];
  return { items, unread: items.filter((n) => !n.is_read).length };
}

export async function markNotificationsRead(userId: string) {
  await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { ok: true as const };
}

export async function recordLogin(userId: string, agent: string) {
  await supabaseAdmin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString(), last_login_agent: agent.slice(0, 200) })
    .eq("id", userId);
  return { ok: true as const };
}

export async function createProofUploadPath(userId: string, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
  return `${userId}/${Date.now()}-${safe}`;
}
