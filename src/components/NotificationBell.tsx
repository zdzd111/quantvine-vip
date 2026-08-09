import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchTransactions } from "@/lib/account.functions";
import { useI18n } from "@/lib/i18n";
import { formatUsdt } from "@/lib/market";

function message(
  type: string,
  status: string,
  amount: number,
  lang: string,
): string {
  const value = `$${formatUsdt(amount)}`;
  const en: Record<string, Record<string, string>> = {
    deposit: {
      pending: `Deposit request of ${value} is under review`,
      approved: `Deposit request of ${value} was approved`,
      rejected: `Deposit request of ${value} was rejected`,
    },
    withdrawal: {
      pending: `Withdrawal of ${value} is under review`,
      approved: `Withdrawal of ${value} was completed`,
      rejected: `Withdrawal of ${value} was rejected`,
    },
    quant: { approved: `Quant task completed, you earned ${value}` },
    commission: { approved: `Team commission of ${value} credited` },
    adjustment: { approved: `Balance adjusted by ${value}` },
  };
  const ar: Record<string, Record<string, string>> = {
    deposit: {
      pending: `طلب الإيداع بقيمة ${value} قيد المراجعة`,
      approved: `تم قبول طلب الإيداع بقيمة ${value}`,
      rejected: `تم رفض طلب الإيداع بقيمة ${value}`,
    },
    withdrawal: {
      pending: `طلب السحب بقيمة ${value} قيد المراجعة`,
      approved: `تم تنفيذ طلب السحب بقيمة ${value}`,
      rejected: `تم رفض طلب السحب بقيمة ${value}`,
    },
    quant: { approved: `تم إكمال مهمة التكميم وربحت ${value}` },
    commission: { approved: `تم إضافة عمولة فريق بقيمة ${value}` },
    adjustment: { approved: `تم تعديل رصيدك بمقدار ${value}` },
  };
  const table = lang === "ar" || lang === "ku" ? ar : en;
  return table[type]?.[status] ?? `${type} ${value}`;
}

export function NotificationBell() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const load = useServerFn(fetchTransactions);
  const { data } = useQuery({ queryKey: ["transactions"], queryFn: () => load() });
  const items = (data ?? []).slice(0, 8);
  const unread = (data ?? []).filter((tx) => tx.status === "pending").length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("home.notifications")}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="num absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="panel absolute end-0 top-11 z-50 w-72 overflow-hidden">
            <p className="border-b border-border px-3 py-2 text-xs font-bold">
              {t("home.notifications")}
            </p>
            {!items.length ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t("home.no_notifications")}
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {items.map((tx) => (
                  <li key={tx.id} className="border-b border-border px-3 py-2.5 last:border-0">
                    <p className="text-[11px] font-semibold leading-snug">
                      {message(tx.type, tx.status, Number(tx.amount), lang)}
                    </p>
                    <p className="num mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("en-GB")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
