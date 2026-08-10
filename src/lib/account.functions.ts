import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const fetchAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccount } = await import("./account.server");
    return getAccount(context.userId);
  });

export const startQuant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runQuant } = await import("./account.server");
    return runQuant(context.userId);
  });

export const createDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number; network: "trc20" | "bep20" }) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        network: z.enum(["trc20", "bep20"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitDeposit } = await import("./account.server");
    return submitDeposit(context.userId, data.amount, data.network);
  });

export const createWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { amount: number; wallet: string; network: "trc20" | "bep20"; pin?: string }) =>
      z
        .object({
          amount: z.number().positive().max(1_000_000),
          wallet: z.string().trim().min(20).max(80),
          network: z.enum(["trc20", "bep20"]),
          pin: z.string().trim().max(6).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitWithdrawal } = await import("./account.server");
    return submitWithdrawal(
      context.userId,
      data.amount,
      data.wallet,
      data.network,
      data.pin,
    );
  });

export const saveWithdrawPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string; currentPin?: string }) =>
    z
      .object({
        pin: z.string().trim().min(4).max(6),
        currentPin: z.string().trim().max(6).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { setWithdrawPin } = await import("./account.server");
    return setWithdrawPin(context.userId, data.pin, data.currentPin);
  });

export const fetchTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getTeam } = await import("./account.server");
    return getTeam(context.userId);
  });

export const fetchTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getTransactions } = await import("./account.server");
    return getTransactions(context.userId);
  });

export const fetchNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getNotifications } = await import("./account.server");
    return getNotifications(context.userId);
  });

export const readNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markNotificationsRead } = await import("./account.server");
    return markNotificationsRead(context.userId);
  });

export const logLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agent: string }) =>
    z.object({ agent: z.string().max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { recordLogin } = await import("./account.server");
    return recordLogin(context.userId, data.agent);
  });
