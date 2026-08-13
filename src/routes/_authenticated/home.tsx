import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UserPlus,
  Handshake,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { buildMarket, formatPrice, formatUsdt, type MarketRow } from "@/lib/market";
import { useAccount } from "@/lib/use-account";
import { useI18n } from "@/lib/i18n";
import { LiveUsersBadge } from "@/components/LiveUsersBadge";
import { MarqueeBanner } from "@/components/MarqueeBanner";
import { IntroVideo } from "@/components/IntroVideo";
import { NotificationBell } from "@/components/NotificationBell";
import { SecurityBadges } from "@/components/SecurityBadges";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Quantvine — منصة التداول الكمي" },
      {
        name: "description",
        content:
          "تابع أسعار العملات الرقمية، ادعُ أصدقاءك، أودِع واسحب أرباحك من منصة Quantvine للتداول الكمي.",
      },
      { property: "og:title", content: "Quantvine — منصة التداول الكمي" },
      {
        property: "og:description",
        content: "أسعار مباشرة، تداول كمي يومي وأرباح فريق متعددة المستويات.",
      },
    ],
  }),
  component: HomePage,
});

const ACTIONS = [
  { to: "/team", label: "ادعو أصدقاء", icon: UserPlus },
  { to: "/agency", label: "تعاون وكيل", icon: Handshake },
  { to: "/deposit", label: "تعبئة رصيد", icon: ArrowDownToLine },
  { to: "/withdraw", label: "ينسحب", icon: ArrowUpFromLine },
] as const;


function HomePage() {
  const [market, setMarket] = useState<MarketRow[]>(() => buildMarket());
  const { data } = useAccount();
  const { t } = useI18n();

  useEffect(() => {
    const timer = setInterval(() => setMarket((prev) => buildMarket(prev)), 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5 px-4 pt-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="gold-surface grid h-9 w-9 shrink-0 place-items-center rounded-xl font-black">
            Q
          </div>
          <span className="gold-text truncate text-xl font-extrabold tracking-tight">Quantvine</span>
        </div>
        <NotificationBell />
      </header>

      <LiveUsersBadge />

      <MarqueeBanner />


      <section className="panel gold-surface overflow-hidden p-4">
        <p className="text-xs font-semibold opacity-80">{t("common.usdt")}</p>
        <p className="num mt-1 text-3xl font-black">${formatUsdt(data?.profile.balance ?? 0)}</p>
        <p className="mt-1 text-xs font-semibold opacity-80">
          {t("common.today_earnings")}{" "}
          <span className="num">${formatUsdt(data?.profile.today_earnings ?? 0)}</span>
        </p>
      </section>

      <section className="grid grid-cols-4 gap-2">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="panel flex flex-col items-center gap-2 px-1 py-3 text-center text-[11px] font-semibold text-foreground"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span className="leading-tight">{label}</span>
          </Link>
        ))}
      </section>

      <IntroVideo />

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">{t("home.market")}</h2>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("home.live")}
          </span>
        </div>
        <ul>
          {market.map((row) => {
            const up = row.change >= 0;
            return (
              <li
                key={row.symbol}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span className="num truncate text-sm font-bold">{row.symbol}</span>
                <span className="num text-sm text-muted-foreground">{formatPrice(row.price)}</span>
                <span
                  className={`num flex w-20 shrink-0 items-center justify-center gap-1 rounded-md py-1 text-xs font-bold ${
                    up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {up ? "+" : ""}
                  {row.change.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <SecurityBadges />
    </div>
  );
}
