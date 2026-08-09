import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claimAdmin } = await import("./admin.server");
    return claimAdmin(context.userId);
  });

export const fetchAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { adminOverview } = await import("./admin.server");
    return adminOverview(context.userId);
  });

export const fetchAdminRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { type: "deposit" | "withdrawal" }) =>
    z.object({ type: z.enum(["deposit", "withdrawal"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminRequests } = await import("./admin.server");
    return adminRequests(context.userId, data.type);
  });

export const approveDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { txId: string; amount: number }) =>
    z.object({ txId: z.string().uuid(), amount: z.number().positive().max(1_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminApproveDeposit } = await import("./admin.server");
    return adminApproveDeposit(context.userId, data.txId, data.amount);
  });

export const approveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { txId: string }) => z.object({ txId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { adminApproveWithdrawal } = await import("./admin.server");
    return adminApproveWithdrawal(context.userId, data.txId);
  });

export const rejectRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { txId: string; reason?: string }) =>
    z.object({ txId: z.string().uuid(), reason: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminReject } = await import("./admin.server");
    return adminReject(context.userId, data.txId, data.reason);
  });

export const fetchAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search: string }) =>
    z.object({ search: z.string().max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminUsers } = await import("./admin.server");
    return adminUsers(context.userId, data.search);
  });

export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string; delta: number }) =>
    z.object({ targetId: z.string().uuid(), delta: z.number().min(-1_000_000).max(1_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminAdjustBalance } = await import("./admin.server");
    return adminAdjustBalance(context.userId, data.targetId, data.delta);
  });

export const setUserVip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string; level: number }) =>
    z.object({ targetId: z.string().uuid(), level: z.number().int().min(1).max(3) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminSetVip } = await import("./admin.server");
    return adminSetVip(context.userId, data.targetId, data.level);
  });

export const setSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: string }) =>
    z.object({ key: z.enum(["deposit_wallet", "deposit_wallet_trc20", "deposit_wallet_bep20", "profit_adjust"]), value: z.string().max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminSetSetting } = await import("./admin.server");
    return adminSetSetting(context.userId, data.key, data.value);
  });

export const setVipRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { level: number; daily_tasks: number; min_rate: number; max_rate: number }) =>
      z
        .object({
          level: z.number().int().min(1).max(3),
          daily_tasks: z.number().int().min(1).max(20),
          min_rate: z.number().min(0).max(50),
          max_rate: z.number().min(0).max(50),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminSetVipRule } = await import("./admin.server");
    return adminSetVipRule(context.userId, data.level, {
      daily_tasks: data.daily_tasks,
      min_rate: data.min_rate,
      max_rate: data.max_rate,
    });
  });
