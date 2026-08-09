import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { fetchTransactions } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { formatUsdt } from "@/lib/market";
import { TxProgress } from "@/components/TxProgress";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة المالية — Quantvine" },
      { name: "description", content: "تابع رصيدك، إيداعاتك وسحوباتك وسجل عمليات التداول الكمي في محفظتك." },
      { property: "og:title", content: "المحفظة المالية — Quantvine" },
      { property: "og:description", content: "إدارة رصيد USDT، الإيداع والسحب وسجل المعاملات." },
    ],
  }),
  component: WalletPage,
});

export const TYPE_LABEL: Record<string, string> = {
  deposit: "تعبئة رصيد",
  withdrawal: "سحب",
  quant: "أرباح التكميم",
  commission: "عمولة الفريق",
  adjustment: "تعديل إداري",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مكتمل",
  rejected: "مرفوض",
};

function WalletPage() {
  const { data: account } = useAccount();
  const load = useServerFn(fetchTransactions);
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => load(),
  });

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <Wallet className="h-5 w-5 text-gold" />
        المحفظة المالية
      </h1>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">الأصول المتاحة (USDT)</p>
        <p className="num mt-1 text-3xl font-black">${formatUsdt(account?.profile.balance ?? 0)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">إجمالي الإيرادات</p>
            <p className="num text-sm font-black">{formatUsdt(account?.profile.total_revenue ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">أرباح اليوم</p>
            <p className="num text-sm font-black">{formatUsdt(account?.profile.today_earnings ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">عمولة اليوم</p>
            <p className="num text-sm font-black">{formatUsdt(account?.profile.today_commission ?? 0)}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/deposit"
          className="gold-surface flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
        >
          <ArrowDownToLine className="h-4 w-4" />
          تعبئة رصيد
        </Link>
        <Link
          to="/withdraw"
          className="flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-card py-3 text-sm font-bold text-gold"
        >
          <ArrowUpFromLine className="h-4 w-4" />
          ينسحب
        </Link>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-sm font-bold">سجل المعاملات</h2>
        {!transactions?.length ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">لا توجد معاملات بعد</p>
        ) : (
          <ul>
            {transactions.map((tx) => {
              const negative = tx.type === "withdrawal" || Number(tx.amount) < 0;
              return (
                <li key={tx.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{TYPE_LABEL[tx.type] ?? tx.type}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className={`num text-sm font-black ${negative ? "text-destructive" : "text-success"}`}>
                      {negative ? "-" : "+"}${formatUsdt(Math.abs(Number(tx.amount)))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{STATUS_LABEL[tx.status]}</p>
                  </div>
                  </div>
                  {(tx.type === "deposit" || tx.type === "withdrawal") && (
                    <TxProgress status={tx.status} />
                  )}
                  {tx.status === "rejected" && tx.note && tx.note !== "rejected" && (
                    <p className="mt-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">
                      سبب الرفض: {tx.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
