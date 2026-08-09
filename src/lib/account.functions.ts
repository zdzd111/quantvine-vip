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
  .inputValidator((input: { amount: number; wallet: string; network: "trc20" | "bep20" }) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        wallet: z.string().trim().min(20).max(80),
        network: z.enum(["trc20", "bep20"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitWithdrawal } = await import("./account.server");
    return submitWithdrawal(context.userId, data.amount, data.wallet, data.network);
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
