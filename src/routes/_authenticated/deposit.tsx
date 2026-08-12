import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ChevronRight } from "lucide-react";

import { createDeposit } from "@/lib/account.functions";
import { NETWORKS, DEPOSIT_PRESETS, type NetworkId } from "@/lib/networks";
import { useI18n } from "@/lib/i18n";
import { playSuccess, playTap } from "@/lib/sfx";
import { SecurityBadges } from "@/components/SecurityBadges";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({
    meta: [
      { title: "تعبئة رصيد — Quantvine" },
      {
        name: "description",
        content: "أودع USDT عبر شبكة TRC-20 أو BEP-20 وتتم المراجعة تلقائياً خلال 3 إلى 10 دقائق.",
      },
      { property: "og:title", content: "تعبئة رصيد — Quantvine" },
      { property: "og:description", content: "إيداع USDT على شبكتي TRC-20 و BEP-20." },
    ],
  }),
  component: DepositPage,
});

function DepositPage() {
  const { t } = useI18n();
  const submit = useServerFn(createDeposit);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [network, setNetwork] = useState<NetworkId>("trc20");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const active = NETWORKS.find((n) => n.id === network)!;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(active.address);
      playTap();
      toast.success(`${t("common.copied")} · ${active.label}`);
    } catch {
      toast.error(t("common.copy_failed"));
    }
  }

  async function handleSubmit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("deposit.invalid"));
      return;
    }
    setBusy(true);
    try {
      await submit({ data: { amount: value, network } });
      // Kick off automatic on-chain matching for this request.
      void fetch("/api/public/hooks/verify-deposits", { method: "POST" }).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      playSuccess();
      toast.success(t("deposit.sent"));
      navigate({ to: "/wallet" });
    } catch {
      toast.error(t("deposit.invalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <Link to="/wallet" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        {t("nav.wallet")}
      </Link>
      <h1 className="text-lg font-extrabold">{t("deposit.title")}</h1>


      <section className="panel space-y-3 p-4">
        <p className="text-xs font-semibold text-muted-foreground">{t("common.network")}</p>
        <div className="grid grid-cols-2 gap-2">
          {NETWORKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNetwork(item.id)}
              className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                network === item.id
                  ? "gold-surface border-transparent"
                  : "border-border bg-elevated text-muted-foreground"
              }`}
            >
              <span className="num block text-xs font-black">{item.label}</span>
              <span className="block text-[10px] font-semibold opacity-80">{item.chain}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="text-[11px] text-muted-foreground">{t("deposit.address")}</p>
          <p className="num break-all text-xs font-bold">{active.address}</p>
        </div>
        <button
          type="button"
          onClick={copyAddress}
          className="gold-surface flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
        >
          <Copy className="h-4 w-4" />
          {t("common.copy")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <label className="block text-sm font-bold" htmlFor="amount">
          {t("deposit.amount")}
        </label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-base outline-none focus:border-gold"
        />
        <div className="grid grid-cols-3 gap-2">
          {DEPOSIT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`num rounded-lg border py-2 text-sm font-bold ${
                amount === String(preset)
                  ? "border-gold text-gold"
                  : "border-border bg-elevated"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? t("common.sending") : t("deposit.submit")}
        </button>

        <p className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("deposit.notice")}
        </p>
      </section>

      <SecurityBadges />
    </div>
  );
}
