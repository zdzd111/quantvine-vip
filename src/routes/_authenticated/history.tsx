import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ReceiptText } from "lucide-react";
import { fetchTransactions } from "@/lib/account.functions";
import { formatUsdt } from "@/lib/market";
import { TxProgress } from "@/components/TxProgress";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "سجل المعاملات — Quantvine" },
      {
        name: "description",
        content: "تابع حالة عمليات الإيداع والسحب: قيد المراجعة، مكتمل أو مرفوض مع سبب الرفض.",
      },
      { property: "og:title", content: "سجل المعاملات — Quantvine" },
      { property: "og:description", content: "حالة وتفاصيل جميع عمليات الإيداع والسحب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

const TYPE_LABEL: Record<string, string> = {
  deposit: "تعبئة رصيد",
  withdrawal: "سحب",
  quant: "أرباح التكميم",
  commission: "عمولة الفريق",
  adjustment: "تعديل إداري",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مكتمل",
  rejected: "مرفوض",
};

function HistoryPage() {
  const load = useServerFn(fetchTransactions);
  const { data } = useQuery({ queryKey: ["transactions"], queryFn: () => load() });
  const rows = (data ?? []).filter((tx) => tx.type === "deposit" || tx.type === "withdrawal");

  return (
    <div className="space-y-5 px-4 pt-5">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        ملكي
      </Link>
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <ReceiptText className="h-5 w-5 text-gold" />
        سجل المعاملات
      </h1>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-sm font-bold">الإيداعات والسحوبات</h2>

            {!rows.length ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                لا توجد عمليات إيداع أو سحب بعد
              </p>
            ) : (
              <ul>
                {rows.map((tx) => {
                  const negative = tx.type === "withdrawal";
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
                          <p
                            className={`num text-sm font-black ${negative ? "text-destructive" : "text-success"}`}
                          >
                            {negative ? "-" : "+"}${formatUsdt(Math.abs(Number(tx.amount)))}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{STATUS_LABEL[tx.status]}</p>
                        </div>
                      </div>
                      <TxProgress status={tx.status} />
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


      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-sm font-bold">الأرباح والعمولات</h2>
        {(() => {
          const rows = (data ?? []).filter(
            (tx) => tx.type === "quant" || tx.type === "commission" || tx.type === "adjustment",
          );
          if (!rows.length) {
            return <p className="px-4 py-8 text-center text-sm text-muted-foreground">لا توجد أرباح بعد</p>;
          }
          return (
            <ul>
              {rows.slice(0, 40).map((tx) => (
                <li
                  key={tx.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{TYPE_LABEL[tx.type] ?? tx.type}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm font-black text-success">
                    +${formatUsdt(Math.abs(Number(tx.amount)))}
                  </p>
                </li>
              ))}
            </ul>
          );
        })()}
      </section>
    </div>
  );
}
