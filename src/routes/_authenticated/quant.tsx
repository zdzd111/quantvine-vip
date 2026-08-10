import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Lock, Timer, Users, Zap } from "lucide-react";
import { startQuant } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { buildFeed, formatUsdt, type FeedRow } from "@/lib/market";
import { useI18n } from "@/lib/i18n";
import { MIN_QUANT_BALANCE } from "@/lib/networks";
import { playError, playSuccess } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/quant")({
  head: () => ({
    meta: [
      { title: "تحديد الكمية — Quantvine" },
      {
        name: "description",
        content:
          "شغّل عمليات التداول الكمي اليومية واحصل على نسبة ربح تلقائية حسب مستوى VIP الخاص بك.",
      },
      { property: "og:title", content: "تحديد الكمية — Quantvine" },
      {
        property: "og:description",
        content: "تداول كمي يومي بنسب ربح من 1.80% حتى 4.20% حسب مستوى VIP.",
      },
    ],
  }),
  component: QuantPage,
});

const VIP_TITLES: Record<number, string> = { 1: "VIP1", 2: "VIP2", 3: "VIP3" };

/** Balance + invite requirement text for a VIP rule. */
function requirementLabel(rule: { min_balance: number | string; min_invites?: number | null }) {
  const base = "$" + formatUsdt(rule.min_balance) + "+";
  const invites = Number(rule.min_invites ?? 0);
  return invites > 0 ? base + " · " + invites + " أصدقاء ($100+)" : base;
}

/** Profit rate range text for a VIP rule (rates are stored as percentages). */
function rateLabel(rule?: { min_rate: number | string; max_rate: number | string }) {
  if (!rule) return "-";
  const min = Number(rule.min_rate).toFixed(1);
  const max = Number(rule.max_rate).toFixed(1);
  return min + "% ~ " + max + "%";
}

/** Milliseconds until the next 11:00 daily reset. */
function msUntilReset(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(11, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function QuantPage() {
  const { t } = useI18n();
  const { data, isLoading } = useAccount();
  const queryClient = useQueryClient();
  const run = useServerFn(startQuant);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedVip, setSelectedVip] = useState(1);
  const [feed, setFeed] = useState<FeedRow[]>(() => buildFeed());
  const [remaining, setRemaining] = useState(() => msUntilReset());
  const [win, setWin] = useState<{ profit: number; rate: number } | null>(null);

  const [lastProfit, setLastProfit] = useState(0);


  useEffect(() => {
    const timer = setInterval(() => setFeed(buildFeed()), 12000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(msUntilReset()), 1000);
    return () => clearInterval(timer);
  }, []);

  const profile = data?.profile;
  const levels = data?.levels ?? [];
  const activeInvites = data?.activeInvites ?? 0;
  const balance = Number(profile?.balance ?? 0);

  const currentRule = useMemo(
    () => levels.find((l) => l.level === (profile?.vip_level ?? 1)),
    [levels, profile?.vip_level],
  );
  const selectedRule = useMemo(
    () => levels.find((l) => l.level === selectedVip),
    [levels, selectedVip],
  );

  const dailyTasks = currentRule?.daily_tasks ?? 5;
  const used = profile?.quant_count ?? 0;
  const exhausted = used >= dailyTasks;
  const lowBalance = balance < MIN_QUANT_BALANCE;

  const nudge = useMemo(() => {
    const vip2 = levels.find((l) => l.level === 2);
    const vip3 = levels.find((l) => l.level === 3);
    const level = profile?.vip_level ?? 1;
    if (level < 2 && vip2) {
      const need = Math.max(0, Number(vip2.min_invites ?? 3) - activeInvites);
      if (need > 0) return `⚡ بقي لك ${need} صديق يشحن $100 لتفتح مستوى VIP2`;
      const money = Math.max(0, Number(vip2.min_balance) - balance);
      if (money > 0) return `⚡ بقي لك $${formatUsdt(money)} في رصيدك لتفتح مستوى VIP2`;
    }
    if (level < 3 && vip3) {
      const need = Math.max(0, Number(vip3.min_invites ?? 6) - activeInvites);
      if (need > 0) return `⚡ بقي لك ${need} صديق يشحن $100 لتفتح مستوى VIP3`;
      const money = Math.max(0, Number(vip3.min_balance) - balance);
      if (money > 0) return `⚡ بقي لك $${formatUsdt(money)} في رصيدك لتفتح مستوى VIP3`;
    }
    return null;
  }, [levels, profile?.vip_level, activeInvites, balance]);

  async function handleRun() {
    if (running || exhausted) return;
    if (lowBalance) {
      playError();
      toast.error(t("quant.low_balance"));
      return;
    }
    setRunning(true);
    setProgress(0);
    const duration = 3000 + Math.round(Math.random() * 2000);
    const started = Date.now();
    const ticker = setInterval(() => {
      setProgress(Math.min(96, Math.round(((Date.now() - started) / duration) * 100)));
    }, 100);
    try {
      const [result] = await Promise.all([
        run(),
        new Promise((resolve) => setTimeout(resolve, duration)),
      ]);
      clearInterval(ticker);
      setProgress(100);
      if (result.status === "exhausted") {
        playError();
        toast.error(t("quant.exhausted_toast"));
      } else if (result.status === "insufficient") {
        playError();
        toast.error(t("quant.low_balance"));
      } else {
        playSuccess();
        setLastProfit(result.profit);
        setWin({ profit: result.profit, rate: result.rate });
      }
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
      clearInterval(ticker);
      playError();
      toast.error(t("quant.low_balance"));
    } finally {
      setTimeout(() => {
        setRunning(false);
        setProgress(0);
      }, 400);
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="text-lg font-extrabold">{t("quant.title")}</h1>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">{t("common.total_revenue")}</p>
        <p className="num mt-1 text-3xl font-black">${formatUsdt(profile?.total_revenue ?? 0)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-[11px] font-semibold opacity-80">{t("common.today_earnings")}</p>
            <p className="num text-lg font-black">${formatUsdt(profile?.today_earnings ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-[11px] font-semibold opacity-80">{t("common.usdt")}</p>
            <p className="num text-lg font-black">${formatUsdt(balance)}</p>
          </div>
        </div>
      </section>

      <p className="panel flex items-center justify-center gap-2 py-2.5 text-xs font-bold">
        <Timer className="h-4 w-4 text-gold" />
        ⏱️ {t("quant.reset_in")} <span className="num text-gold">{formatCountdown(remaining)}</span>
      </p>

      <section className="panel flex flex-col items-center gap-4 p-6">
        <div className="relative grid h-40 w-40 place-items-center">
          <div
            className={`pointer-events-none absolute inset-0 rounded-full border-4 ${
              running ? "border-gold/40 pulse-ring" : "border-border"
            }`}
          />

          <button
            type="button"
            onClick={handleRun}
            disabled={running || exhausted || isLoading}
            className={`grid h-32 w-32 place-items-center rounded-full text-center text-sm font-black leading-tight transition-transform active:scale-95 ${
              exhausted
                ? "bg-muted text-muted-foreground"
                : "gold-surface shadow-gold disabled:opacity-45"
            }`}
          >
            {running ? (
              <span className="flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="num text-xs">{progress}%</span>
              </span>
            ) : exhausted ? (
              <span className="flex flex-col items-center gap-1 px-2 text-xs">
                <span>{t("quant.done_all")}</span>
                <span className="num">
                  ({used}/{dailyTasks})
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1 px-2">
                <Zap className="h-6 w-6" />
                <span>{t("quant.start")}</span>
                <span className="num text-xs">
                  ({used}/{dailyTasks})
                </span>
              </span>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
  {running
    ? t("quant.running")
    : exhausted
      ? t("quant.exhausted_toast")
      : lowBalance
        ? t("quant.low_balance")
        : null}
</p>
        {running && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="gold-surface h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </section>

      <p className="panel p-4 text-xs font-bold leading-relaxed text-gold">{t("quant.team_card")}</p>

      {nudge && (
        <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs font-bold leading-relaxed">
          {nudge}
        </p>
      )}

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{t("quant.levels")}</h2>
          <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
            {VIP_TITLES[selectedVip]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={1}
          value={selectedVip}
          onChange={(event) => setSelectedVip(Number(event.target.value))}
          aria-label={t("quant.levels")}
          className="w-full accent-[var(--gold)]"
        />
        <div className="num mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>VIP1</span>
          <span>VIP2</span>
          <span>VIP3</span>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("quant.daily_tasks")}</dt>
            <dd className="num font-bold">{selectedRule?.daily_tasks ?? "-"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("quant.rate")}</dt>
            <dd className="num font-bold text-gold">{rateLabel(selectedRule)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{t("quant.requirement")}</dt>
            <dd className="num text-end text-xs font-bold">
              {selectedRule ? requirementLabel(selectedRule) : "-"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2">
          {levels.map((rule) => {
            const locked = (profile?.vip_level ?? 1) < rule.level;
            return (
              <div
                key={rule.level}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                  locked ? "border-border bg-elevated" : "border-gold/50 bg-gold/5"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-black">
                    {locked && <Lock className="h-3.5 w-3.5 text-gold" />}
                    {VIP_TITLES[rule.level]}
                  </p>
                  <p className="num mt-0.5 text-[10px] text-muted-foreground">
                    {rateLabel(rule)} · {rule.daily_tasks} · {requirementLabel(rule)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    locked ? "bg-muted text-muted-foreground" : "gold-surface"
                  }`}
                >
                  {locked ? t("quant.locked") : "✓"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-sm font-bold">{t("quant.feed")}</h2>
        <div className="h-56 overflow-hidden">
          <ul className="marquee-up">
            {[...feed, ...feed].map((row, index) => (
              <li
                key={`${row.id}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-2.5 text-xs"
              >
                <span className="num text-muted-foreground">{row.user}</span>
                <span className="num text-center font-bold text-gold">${row.amount}</span>
                <span className="rounded bg-success/15 px-2 py-0.5 font-semibold text-success">
                  {t("quant.feed_ok")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {win && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="panel w-full max-w-xs animate-[scale-in_0.2s_ease-out] p-5 text-center">
            <div className="gold-surface mx-auto grid h-12 w-12 place-items-center rounded-2xl">
              <Zap className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-black">{t("quant.success")}</p>
            <p className="num mt-2 text-2xl font-black text-gold">
              +${formatUsdt(profitPerClick)} USDT
            </p>
            <p className="num mt-1 text-[11px] text-muted-foreground">{win.rate}%</p>
            <p className="num mt-2 text-[11px] font-bold">
              {used}/{dailyTasks}
            </p>
            <button
              type="button"
              onClick={() => setWin(null)}
              className="gold-surface mt-4 w-full rounded-xl py-2.5 text-sm font-black"
            >
              {t("welcome.cta")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
