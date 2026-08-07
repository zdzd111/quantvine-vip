import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { startQuant } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { buildFeed, formatUsdt, type FeedRow } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/quant")({
  head: () => ({
    meta: [
      { title: "تحديد الكمية — Quantvine" },
      { name: "description", content: "شغّل عمليات التداول الكمي اليومية واحصل على نسبة ربح تلقائية حسب مستوى VIP الخاص بك." },
      { property: "og:title", content: "تحديد الكمية — Quantvine" },
      { property: "og:description", content: "تداول كمي يومي بنسب ربح من 1.80% حتى 3.10% حسب مستوى VIP." },
    ],
  }),
  component: QuantPage,
});

const VIP_TITLES: Record<number, string> = { 1: "VIP1", 2: "VIP2", 3: "VIP3" };

function QuantPage() {
  const { data, isLoading } = useAccount();
  const queryClient = useQueryClient();
  const run = useServerFn(startQuant);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedVip, setSelectedVip] = useState(1);
  const [feed, setFeed] = useState<FeedRow[]>(() => buildFeed());

  useEffect(() => {
    if (data?.profile.vip_level) setSelectedVip(data.profile.vip_level);
  }, [data?.profile.vip_level]);

  useEffect(() => {
    const timer = setInterval(() => setFeed(buildFeed()), 12000);
    return () => clearInterval(timer);
  }, []);

  const profile = data?.profile;
  const levels = data?.levels ?? [];
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

  async function handleRun() {
    if (running || exhausted) return;
    setRunning(true);
    setProgress(0);
    const ticker = setInterval(() => setProgress((p) => Math.min(96, p + 4)), 110);
    try {
      const [result] = await Promise.all([
        run(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      clearInterval(ticker);
      setProgress(100);
      if (result.status === "exhausted") {
        toast.error("تم استنفاذ عدد مرات التكميم اليومية، يُرجى العودة غداً بعد الساعة 11:00 AM");
      } else if (result.status === "insufficient") {
        toast.error(`الرصيد غير كافٍ، الحد الأدنى ${formatUsdt(result.required)} USDT`);
      } else {
        toast.success(`تحديد النجاح +${formatUsdt(result.profit)} USDT (${result.rate}%)`);
      }
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
      clearInterval(ticker);
      toast.error("تعذر تنفيذ العملية، حاول مرة أخرى");
    } finally {
      setTimeout(() => {
        setRunning(false);
        setProgress(0);
      }, 400);
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="text-lg font-extrabold">تحديد الكمية</h1>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">إجمالي الإيرادات (USDT)</p>
        <p className="num mt-1 text-3xl font-black">{formatUsdt(profile?.total_revenue ?? 0)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-[11px] font-semibold opacity-80">أرباح اليوم</p>
            <p className="num text-lg font-black">{formatUsdt(profile?.today_earnings ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-[11px] font-semibold opacity-80">الأصول المتاحة</p>
            <p className="num text-lg font-black">{formatUsdt(profile?.balance ?? 0)}</p>
          </div>
        </div>
      </section>

      <section className="panel flex flex-col items-center gap-4 p-6">
        <div className="relative grid h-40 w-40 place-items-center">
          <div
            className={`absolute inset-0 rounded-full border-4 ${
              running ? "border-gold/40 pulse-ring" : "border-border"
            }`}
          />
          <button
            type="button"
            onClick={handleRun}
            disabled={running || exhausted || isLoading}
            className="gold-surface grid h-32 w-32 place-items-center rounded-full text-center text-sm font-black leading-tight shadow-gold transition-transform active:scale-95 disabled:opacity-45"
          >
            {running ? (
              <span className="flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="num text-xs">{progress}%</span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1 px-2">
                <Zap className="h-6 w-6" />
                <span>تقدير بداية واحدة</span>
                <span className="num text-xs">
                  ({used}/{dailyTasks})
                </span>
              </span>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {running
            ? "جارٍ مطابقة أوامر التداول الكمي..."
            : exhausted
              ? "تم استنفاذ عدد مرات التكميم اليومية، يُرجى العودة غداً بعد الساعة 11:00 AM"
              : `مستواك الحالي ${VIP_TITLES[profile?.vip_level ?? 1]} — نسبة الربح ${currentRule?.min_rate ?? "1.80"}% ~ ${currentRule?.max_rate ?? "2.10"}%`}
        </p>
        {running && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full gold-surface transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">مستويات VIP</h2>
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
          aria-label="اختيار مستوى VIP"
          className="w-full accent-[var(--gold)]"
        />
        <div className="num mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>VIP1</span>
          <span>VIP2</span>
          <span>VIP3</span>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">عدد المهام اليومية</dt>
            <dd className="num font-bold">{selectedRule?.daily_tasks ?? "-"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">نسبة الربح</dt>
            <dd className="num font-bold text-gold">
              {selectedRule ? `${selectedRule.min_rate}% ~ ${selectedRule.max_rate}%` : "-"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">متطلبات الرصيد</dt>
            <dd className="num font-bold">
              {selectedRule
                ? `${formatUsdt(selectedRule.min_balance)} ~ ${formatUsdt(selectedRule.max_balance)} USDT`
                : "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-sm font-bold">سجل التحديد المباشر</h2>
        <div className="h-56 overflow-hidden">
          <ul className="marquee-up">
            {[...feed, ...feed].map((row, index) => (
              <li
                key={`${row.id}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-2.5 text-xs"
              >
                <span className="num text-muted-foreground">{row.user}</span>
                <span className="num text-center font-bold text-gold">{row.amount} USDT</span>
                <span className="rounded bg-success/15 px-2 py-0.5 font-semibold text-success">
                  تحديد النجاح
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
