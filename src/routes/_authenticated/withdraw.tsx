import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createWithdrawal } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { formatUsdt } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "ينسحب — Quantvine" },
      { name: "description", content: "اسحب أرباحك بعنوان USDT TRC-20 مع تحقق فوري من الرصيد المتاح." },
      { property: "og:title", content: "ينسحب — Quantvine" },
      { property: "og:description", content: "سحب أرباح USDT عبر شبكة TRC-20." },
    ],
  }),
  component: WithdrawPage,
});

const MIN_WITHDRAW = 10;

function WithdrawPage() {
  const { data } = useAccount();
  const submit = useServerFn(createWithdrawal);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const balance = Number(data?.profile.balance ?? 0);

  async function handleSubmit() {
    const value = Number(amount);
    const address = wallet.trim();
    if (address.length < 26 || !address.startsWith("T")) {
      toast.error("عنوان محفظة TRC-20 غير صالح");
      return;
    }
    if (!Number.isFinite(value) || value < MIN_WITHDRAW) {
      toast.error(`الحد الأدنى للسحب ${MIN_WITHDRAW} USDT`);
      return;
    }
    if (value > balance) {
      toast.error("الرصيد المتاح غير كافٍ");
      return;
    }
    setBusy(true);
    try {
      const result = await submit({ data: { amount: value, wallet: address } });
      if (result && "status" in result && result.status === "insufficient") {
        toast.error("الرصيد المتاح غير كافٍ");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم إرسال طلب السحب، سيتم مراجعته قريباً");
      navigate({ to: "/wallet" });
    } catch {
      toast.error("تعذر إرسال الطلب، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="text-lg font-extrabold">ينسحب</h1>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">الأصول المتاحة (USDT)</p>
        <p className="num mt-1 text-3xl font-black">{formatUsdt(balance)}</p>
      </section>

      <section className="panel space-y-3 p-4">
        <label className="block text-sm font-bold" htmlFor="wallet">
          عنوان المحفظة (USDT · TRC-20)
        </label>
        <input
          id="wallet"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder="T..."
          maxLength={80}
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />

        <label className="block text-sm font-bold" htmlFor="wamount">
          مبلغ السحب (USDT)
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
          سحب الكل
        </button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          الحد الأدنى للسحب <span className="num">{MIN_WITHDRAW}</span> USDT. تتم مراجعة الطلبات
          يدوياً وقد تستغرق حتى 24 ساعة.
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ الإرسال..." : "تأكيد السحب"}
        </button>
      </section>
    </div>
  );
}
