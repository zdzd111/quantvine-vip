import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { createWithdrawal } from "@/lib/account.functions";

import { useAccount } from "@/lib/use-account";
import { formatUsdt } from "@/lib/market";
import { MIN_WITHDRAW, NETWORKS, type NetworkId } from "@/lib/networks";
import { useI18n } from "@/lib/i18n";
import { playSuccess } from "@/lib/sfx";
import { SecurityBadges } from "@/components/SecurityBadges";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "ينسحب — Quantvine" },
      {
        name: "description",
        content: "اسحب أرباحك عبر شبكة USDT TRC-20 أو BEP-20 بحد أدنى $10 مع تحقق فوري من الرصيد.",
      },
      { property: "og:title", content: "ينسحب — Quantvine" },
      { property: "og:description", content: "سحب أرباح USDT عبر TRC-20 أو BEP-20." },
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { t } = useI18n();
  const { data } = useAccount();
  const submit = useServerFn(createWithdrawal);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [network, setNetwork] = useState<NetworkId>("trc20");
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const balance = Number(data?.profile.balance ?? 0);
  const active = NETWORKS.find((n) => n.id === network)!;
  const hasPin = Boolean(data?.hasWithdrawPin);
  const hasPending = (data?.pendingWithdrawals ?? 0) > 0;
  const requested = Number(amount) > 0 ? Number(amount) : 0;
  const fee = Math.round(requested * WITHDRAW_FEE_RATE * 100) / 100;
  const net = Math.round((requested - fee) * 100) / 100;

  async function handleSubmit() {
    const value = Number(amount);
    const address = wallet.trim();
    if (hasPending) {
      toast.error("لديك طلب سحب قيد المراجعة، يُرجى انتظار معالجته قبل تقديم طلب جديد");
      return;
    }
    if (!active.validate(address)) {
      toast.error(t("withdraw.bad_address"));
      return;
    }
    if (!Number.isFinite(value) || value < MIN_WITHDRAW) {
      toast.error(t("withdraw.min_error"));
      return;
    }
    if (value > balance) {
      toast.error(t("withdraw.insufficient"));
      return;
    }
    if (hasPin && !/^\d{4,6}$/.test(pin)) {
      toast.error("يُرجى إدخال كلمة مرور السحب (4-6 أرقام)");
      return;
    }
    setBusy(true);
    try {
      const result = await submit({
        data: hasPin
          ? { amount: value, wallet: address, network, pin }
          : { amount: value, wallet: address, network },
      });
      if (result && "ok" in result && result.ok === false) {
        const reason = result.reason;
        toast.error(
          reason === "min"
            ? t("withdraw.min_error")
            : reason === "pin"
              ? "كلمة مرور السحب غير صحيحة"
              : reason === "pending"
                ? "لديك طلب سحب قيد المراجعة، يُرجى انتظار معالجته"
                : reason === "wallet"
                  ? t("withdraw.bad_address")
                  : t("withdraw.insufficient"),
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      playSuccess();
      toast.success("تم استلام طلب السحب بنجاح، سيتم معالجة وتحويل الأموال خلال 24 إلى 48 ساعة قادمة");
      navigate({ to: "/history" });
    } catch {
      toast.error(t("withdraw.insufficient"));
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
      <h1 className="text-lg font-extrabold">{t("withdraw.title")}</h1>


      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">{t("common.usdt")}</p>
        <p className="num mt-1 text-3xl font-black">${formatUsdt(balance)}</p>
      </section>

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

        <label className="block text-sm font-bold" htmlFor="wallet">
          {t("withdraw.address")} · <span className="num">{active.label}</span>
        </label>
        <input
          id="wallet"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder={network === "trc20" ? "T..." : "0x..."}
          maxLength={80}
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />

        <label className="block text-sm font-bold" htmlFor="wamount">
          {t("withdraw.amount")}
        </label>
        <input
          id="wamount"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-base outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => setAmount(String(balance))}
          className="text-xs font-bold text-gold"
        >
          {t("withdraw.all")}
        </button>

        {hasPin ? (
          <>
            <label className="block text-sm font-bold" htmlFor="wpin">
              كلمة مرور السحب
            </label>
            <input
              id="wpin"
              type="password"
              inputMode="numeric"
              value={pin}
              maxLength={6}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
            />
          </>
        ) : (
          <Link
            to="/security"
            className="block rounded-xl border border-gold/40 bg-elevated px-3 py-2.5 text-[11px] font-bold leading-relaxed text-gold"
          >
            🔒 لحماية أموالك، أنشئ كلمة مرور السحب من مركز الأمان
          </Link>
        )}

        {hasPending && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-destructive">
            لديك طلب سحب قيد المراجعة. لا يمكن تقديم طلب جديد قبل معالجته.
          </p>
        )}

        <div className="space-y-1 rounded-xl border border-gold/30 bg-elevated px-3 py-2.5 text-[11px] font-semibold leading-relaxed">
          <p className="text-muted-foreground">
            رسوم الشبكة التلقائية: <span className="num text-gold">3%</span> ·{" "}
            <span className="num">${formatUsdt(fee)}</span>
          </p>
          <p className="text-muted-foreground">
            المبلغ الصافي المُحوَّل إليك: <span className="num text-gold">${formatUsdt(net)}</span>
          </p>
          <p className="text-muted-foreground">
            تُرسل الرسوم تلقائياً إلى محفظة {active.label}.
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("withdraw.min")}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          تتم معالجة وتحويل الأموال خلال 24 إلى 48 ساعة بعد المراجعة.
        </p>


        <button
          type="button"
          disabled={busy || hasPending}
          onClick={handleSubmit}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >

          {busy ? t("common.sending") : t("withdraw.submit")}
        </button>
      </section>

      <SecurityBadges />
    </div>
  );
}
