import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { COMMISSION_DEPOSIT, loadProfile, notify, rollDay } from "./account.server";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export async function requireAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("Forbidden");
}

/** Grants full admin to the signed-in account (no first-account restriction). */
export async function claimAdmin(userId: string) {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
  return { ok: true as const };
}

async function attachUsers<T extends { user_id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (!ids.length) return rows.map((r) => ({ ...r, user: null }));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, public_id, vip_level, balance, email")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, user: map.get(r.user_id) ?? null }));
}

export async function adminOverview(userId: string) {
  await requireAdmin(userId);
  const [
    users,
    pendingDeposits,
    pendingWithdrawals,
    deposits,
    withdrawals,
    balances,
    wallet,
    walletBep,
    adjust,
    announcement,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "deposit")
      .eq("status", "pending"),
    supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "withdrawal")
      .eq("status", "pending"),
    supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("type", "deposit")
      .eq("status", "approved"),
    supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("type", "withdrawal")
      .eq("status", "approved"),
    supabaseAdmin.from("profiles").select("balance"),
    supabaseAdmin.from("app_settings").select("value").eq("key", "deposit_wallet_trc20").maybeSingle(),
    supabaseAdmin.from("app_settings").select("value").eq("key", "deposit_wallet_bep20").maybeSingle(),
    supabaseAdmin.from("app_settings").select("value").eq("key", "profit_adjust").maybeSingle(),
    supabaseAdmin.from("app_settings").select("value").eq("key", "announcement").maybeSingle(),
  ]);
  const sum = (rows: Array<{ amount: number }> | null) =>
    round2((rows ?? []).reduce((s, d) => s + Number(d.amount), 0));
  return {
    users: users.count ?? 0,
    pendingDeposits: pendingDeposits.count ?? 0,
    pendingWithdrawals: pendingWithdrawals.count ?? 0,
    depositVolume: sum(deposits.data),
    withdrawVolume: sum(withdrawals.data),
    totalBalance: round2(
      (balances.data ?? []).reduce((s, p) => s + Number(p.balance), 0),
    ),
    depositWallet: wallet.data?.value ?? "",
    depositWalletBep: walletBep.data?.value ?? "",
    profitAdjust: adjust.data?.value ?? "0",
    announcement: announcement.data?.value ?? "",
  };
}

export async function adminRequests(userId: string, type: "deposit" | "withdrawal") {
  await requireAdmin(userId);
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("type", type)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  return attachUsers(data ?? []);
}

export async function adminApproveDeposit(
  userId: string,
  txId: string,
  actualAmount: number,
) {
  await requireAdmin(userId);
  return settleDeposit(txId, actualAmount);
}

/** Credits an approved deposit, pays the $7 referral bonus and upline commissions. */
export async function settleDeposit(
  txId: string,
  actualAmount: number,
  note = "approved",
) {
  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", txId)
    .single();
  if (!tx || tx.status !== "pending" || tx.type !== "deposit") {
    throw new Error("Request already handled");
  }
  const amount = round2(actualAmount);
  const profile = await loadProfile(tx.user_id);
  await supabaseAdmin
    .from("profiles")
    .update({ balance: round2(Number(profile.balance) + amount) })
    .eq("id", tx.user_id);
  await supabaseAdmin
    .from("transactions")
    .update({ status: "approved", amount, note })
    .eq("id", txId);
  await notify(
    tx.user_id,
    "تمت تعبئة رصيدك",
    `تم تأكيد إيداع بقيمة $${amount} وإضافته إلى رصيدك.`,
    "deposit",
  );

  // Flat $7 bonus to the direct referrer on the member's first $100+ deposit.
  if (amount >= 100) {
    const { data: direct } = await supabaseAdmin
      .from("referrals")
      .select("ancestor_id")
      .eq("descendant_id", tx.user_id)
      .eq("level", 1)
      .maybeSingle();
    if (direct?.ancestor_id) {
      const { data: already } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("user_id", direct.ancestor_id)
        .eq("note", `refbonus:${tx.user_id}`)
        .maybeSingle();
      if (!already) {
        const { data: anc } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", direct.ancestor_id)
          .single();
        if (anc) {
          const fresh = await rollDay(anc);
          await supabaseAdmin
            .from("profiles")
            .update({
              balance: round2(Number(fresh.balance) + 7),
              total_revenue: round2(Number(fresh.total_revenue) + 7),
              today_commission: round2(Number(fresh.today_commission) + 7),
            })
            .eq("id", fresh.id);
          await supabaseAdmin.from("transactions").insert({
            user_id: fresh.id,
            type: "commission",
            amount: 7,
            status: "approved",
            note: `refbonus:${tx.user_id}`,
          });
          await notify(
            fresh.id,
            "مكافأة دعوة صديق 🎉",
            "حصلت على مكافأة $7 لأن أحد أصدقائك أكمل تعبئة رصيد بقيمة $100 أو أكثر.",
            "commission",
          );
        }
      }
    }
  }

  const { data: uplines } = await supabaseAdmin
    .from("referrals")
    .select("ancestor_id, level")
    .eq("descendant_id", tx.user_id);
  for (const up of uplines ?? []) {
    const rate = COMMISSION_DEPOSIT[up.level as 1 | 2 | 3];
    if (!rate) continue;
    const bonus = round2(amount * rate);
    if (bonus <= 0) continue;
    const { data: anc } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", up.ancestor_id)
      .single();
    if (!anc) continue;
    const fresh = await rollDay(anc);
    await supabaseAdmin
      .from("profiles")
      .update({
        balance: round2(Number(fresh.balance) + bonus),
        total_revenue: round2(Number(fresh.total_revenue) + bonus),
        today_commission: round2(Number(fresh.today_commission) + bonus),
      })
      .eq("id", fresh.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: fresh.id,
      type: "commission",
      amount: bonus,
      status: "approved",
      note: `level${up.level}:deposit`,
    });
    await notify(
      fresh.id,
      "عمولة إيداع فريق",
      `تم إضافة عمولة بقيمة $${bonus} من إيداع أحد أعضاء المستوى ${up.level}.`,
      "commission",
    );
  }
  return { ok: true };
}

export async function adminApproveWithdrawal(userId: string, txId: string) {
  await requireAdmin(userId);
  const { data: tx, error } = await supabaseAdmin
    .from("transactions")
    .update({ status: "approved", note: "approved" })
    .eq("id", txId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (tx) {
    await notify(
      tx.user_id,
      "تم تنفيذ السحب",
      `تم تحويل مبلغ $${round2(Number(tx.amount))} إلى محفظتك بنجاح.`,
      "withdrawal",
    );
  }
  return { ok: true };
}

export async function adminReject(userId: string, txId: string, reason?: string) {
  await requireAdmin(userId);
  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", txId)
    .single();
  if (!tx || tx.status !== "pending") throw new Error("Request already handled");
  if (tx.type === "withdrawal") {
    const profile = await loadProfile(tx.user_id);
    await supabaseAdmin
      .from("profiles")
      .update({ balance: round2(Number(profile.balance) + Number(tx.amount)) })
      .eq("id", tx.user_id);
  }
  const note = (reason ?? "").trim() || "rejected";
  await supabaseAdmin
    .from("transactions")
    .update({ status: "rejected", note })
    .eq("id", txId);
  await notify(
    tx.user_id,
    tx.type === "withdrawal" ? "تم رفض طلب السحب" : "تم رفض طلب التعبئة",
    `المبلغ: $${round2(Number(tx.amount))}${note !== "rejected" ? ` · السبب: ${note}` : ""}`,
    tx.type === "withdrawal" ? "withdrawal" : "deposit",
  );
  return { ok: true };
}

export async function adminUsers(userId: string, search: string) {
  await requireAdmin(userId);
  let query = supabaseAdmin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const term = search.trim();
  if (term) {
    query = query.or(
      `username.ilike.%${term}%,public_id.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminAdjustBalance(
  userId: string,
  targetId: string,
  delta: number,
) {
  await requireAdmin(userId);
  const profile = await loadProfile(targetId);
  const next = round2(Number(profile.balance) + delta);
  if (next < 0) throw new Error("الرصيد لا يمكن أن يكون سالباً");
  await supabaseAdmin.from("profiles").update({ balance: next }).eq("id", targetId);
  await supabaseAdmin.from("transactions").insert({
    user_id: targetId,
    type: "adjustment",
    amount: round2(delta),
    status: "approved",
    note: "admin",
  });
  await notify(
    targetId,
    "تعديل رصيد",
    `تم ${delta >= 0 ? "إضافة" : "خصم"} $${Math.abs(round2(delta))} ${delta >= 0 ? "إلى" : "من"} رصيدك من قبل الإدارة.`,
    "info",
  );
  return { ok: true };
}

export async function adminSetVip(userId: string, targetId: string, level: number) {
  await requireAdmin(userId);
  await supabaseAdmin.from("profiles").update({ vip_level: level }).eq("id", targetId);
  await notify(targetId, "تحديث مستوى VIP", `تم تعيين حسابك على المستوى VIP${level}.`, "info");
  return { ok: true };
}

export async function adminSetSetting(userId: string, key: string, value: string) {
  await requireAdmin(userId);
  await supabaseAdmin
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return { ok: true };
}

export async function adminSetVipRule(
  userId: string,
  level: number,
  patch: { daily_tasks: number; min_rate: number; max_rate: number },
) {
  await requireAdmin(userId);
  await supabaseAdmin.from("vip_levels").update(patch).eq("level", level);
  return { ok: true };
}
