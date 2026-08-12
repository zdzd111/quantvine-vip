import { createFileRoute } from "@tanstack/react-router";

/**
 * Automated deposit reconciliation. Called by the platform scheduler and by the
 * deposit page right after a member submits a recharge request.
 */
export const Route = createFileRoute("/api/public/hooks/verify-deposits")({
  server: {
    handlers: {
      POST: async () => {
        const { syncDeposits } = await import("@/lib/deposit-watch.server");
        try {
          const result = await syncDeposits();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
