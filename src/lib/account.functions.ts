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
  .inputValidator((input: { amount: number; proofPath: string | null }) =>
    z.object({ amount: z.number().positive().max(1_000_000), proofPath: z.string().max(300).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitDeposit } = await import("./account.server");
    return submitDeposit(context.userId, data.amount, data.proofPath);
  });

export const createWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number; wallet: string }) =>
    z.object({ amount: z.number().positive().max(1_000_000), wallet: z.string().trim().min(20).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitWithdrawal } = await import("./account.server");
    return submitWithdrawal(context.userId, data.amount, data.wallet);
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
