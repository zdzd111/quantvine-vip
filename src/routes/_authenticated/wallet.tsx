import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, ReceiptText, Wallet } from "lucide-react";
import { useAccount } from "@/lib/use-account";
import { formatUsdt } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة المالية — Quantvine" },
      {
        name: "description",
        content: "تابع رصيد USDT المتاح، أرباح التداول الكمي اليومية وعمولات فريقك، وابدأ الإيداع أو السحب.",
      },
      { property: "og:title", content: "المحفظة المالية — Quantvine" },
      { property: "og:description", content: "إدارة رصيد USDT، الإيداع والسحب وأرباح التكميم." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data: account } = useAccount();
  const profile = account?.profile;

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <Wallet className="h-5 w-5 text-gold" />
        المحفظة المالية
      </h1>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">الأصول المتاحة (USDT)</p>
        <p className="num mt-1 text-3xl font-black">${formatUsdt(profile?.balance ?? 0)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">إجمالي الإيرادات</p>
            <p className="num text-sm font-black">{formatUsdt(profile?.total_revenue ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">أرباح اليوم</p>
            <p className="num text-sm font-black">{formatUsdt(profile?.today_earnings ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2">
            <p className="text-[10px] font-semibold opacity-80">عمولة اليوم</p>
            <p className="num text-sm font-black">{formatUsdt(profile?.today_commission ?? 0)}</p>
          </div>
        </div>
      </section>


      <section className="panel grid grid-cols-2 gap-3 p-4 text-center">
        <div className="rounded-xl bg-elevated p-3">
          <p className="text-[10px] font-semibold text-muted-foreground">أرباح الأمس</p>
          <p className="num text-sm font-black">${formatUsdt(profile?.yesterday_earnings ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-elevated p-3">
          <p className="text-[10px] font-semibold text-muted-foreground">مهام اليوم المنجزة</p>
          <p className="num text-sm font-black">{profile?.quant_count ?? 0}</p>
        </div>
      </section>

      <Link
        to="/quant"
        className="gold-surface flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black"
      >
        بدء التداول الكمي اليومي
      </Link>

      <Link
        to="/history"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-muted-foreground"
      >
        <ReceiptText className="h-4 w-4 text-gold" />
        سجل المعاملات
      </Link>
    </div>
  );
}
