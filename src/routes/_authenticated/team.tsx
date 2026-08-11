import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, QrCode, Users } from "lucide-react";
import QRCode from "qrcode";
import { fetchTeam } from "@/lib/account.functions";
import { formatUsdt } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "فريقي — Quantvine" },
      { name: "description", content: "شارك رابط الدعوة الخاص بك وتابع عمولات فريقك على ثلاثة مستويات." },
      { property: "og:title", content: "فريقي — Quantvine" },
      { property: "og:description", content: "نظام إحالة من ثلاثة مستويات مع عمولات تلقائية." },
    ],
  }),
  component: TeamPage,
});

const LEVEL_LABEL: Record<number, string> = {
  1: "Level1 المرؤوس",
  2: "Level2 المرؤوس",
  3: "Level3 المرؤوس",
};

const LEVEL_RATE: Record<number, string> = { 1: "10%", 2: "5%", 3: "2%" };

function TeamPage() {
  const load = useServerFn(fetchTeam);
  const { data } = useQuery({ queryKey: ["team"], queryFn: () => load() });
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!data?.inviteCode || typeof window === "undefined") return;
    const url = `${window.location.origin}/?invite=${data.inviteCode}`;
    setLink(url);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: "#F0B90B", light: "#00000000" },
    }).then(setQr);
  }, [data?.inviteCode]);

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("تعذر النسخ");
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="text-lg font-extrabold">فريقي</h1>

      <section className="panel space-y-2 border border-gold/40 p-4">
        <p className="text-sm font-black text-gold">ادعُ صديقاً يشحن $100 واكسب $7 فوراً</p>
        <div className="flex items-center justify-between gap-2">
          <span className="num rounded-lg bg-elevated px-3 py-1.5 text-xs font-bold">
            عدد الأصدقاء: {data?.activeInvites ?? 0}
          </span>
          <button
            type="button"
            onClick={() => copy(link, "تم نسخ رابط الدعوة")}
            className="gold-surface rounded-lg px-3 py-1.5 text-xs font-black"
          >
            مشاركة الرابط 🔗
          </button>
        </div>
      </section>

      <section className="panel space-y-2 p-4">
        <p className="text-xs font-black">ادعُ 3 أصدقاء ($100+) واحتفظ بـ $200 لفتح VIP2</p>
        {[
          {
            label: "الأصدقاء النشطون",
            value: data?.activeInvites ?? 0,
            target: 3,
            suffix: "صديق",
          },
          {
            label: "الرصيد الشخصي",
            value: Number(data?.balance ?? 0),
            target: 200,
            suffix: "$",
          },
        ].map((row) => {
          const pct = Math.min(100, Math.round((row.value / row.target) * 100));
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>{row.label}</span>
                <span className="num text-gold">
                  {formatUsdt(row.value)} / {row.target} {row.suffix}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {(data?.activeInvites ?? 0) === 2 && (
          <p className="text-[11px] font-black text-gold">⚡ بقي لك صديق واحد فقط لفتح VIP2!</p>
        )}
      </section>


      <section className="panel space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <QrCode className="h-4 w-4 text-gold" />
          ادعو أصدقاء
        </div>
        <div className="grid place-items-center rounded-xl bg-elevated p-4">
          {qr ? (
            <img src={qr} alt="رمز QR لرابط الدعوة" className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-lg bg-muted" />
          )}
        </div>
        <div className="space-y-2">
          <div className="rounded-xl border border-border bg-elevated p-3">
            <p className="text-[11px] text-muted-foreground">كود الدعوة</p>
            <p className="num text-lg font-black tracking-widest text-gold">
              {data?.inviteCode ?? "..."}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-elevated p-3">
            <p className="text-[11px] text-muted-foreground">رابط الدعوة</p>
            <p className="num break-all text-xs">{link || "..."}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => copy(data?.inviteCode ?? "", "تم نسخ كود الدعوة")}
            className="rounded-xl border border-border bg-elevated py-2.5 text-sm font-bold"
          >
            نسخ الكود
          </button>
          <button
            type="button"
            onClick={() => copy(link, "تم نسخ رابط الدعوة")}
            className="gold-surface flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
          >
            <Copy className="h-4 w-4" />
            نسخ الرابط
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <p className="text-[11px] text-muted-foreground">عمولة اليوم</p>
          <p className="num text-xl font-black text-gold">
            {formatUsdt(data?.todayCommission ?? 0)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] text-muted-foreground">إجمالي العمولات</p>
          <p className="num text-xl font-black">{formatUsdt(data?.totalCommission ?? 0)}</p>
        </div>
      </section>

      <section className="space-y-3">
        {(data?.levels ?? [1, 2, 3].map((level) => ({ level, members: 0, active: 0, deposits: 0, commission: 0 }))).map(
          (row) => (
            <article key={row.level} className="panel p-4">
              <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold">
                  <Users className="h-4 w-4 shrink-0 text-gold" />
                  <span className="truncate">{LEVEL_LABEL[row.level]}</span>
                </h2>
                <span className="num shrink-0 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                  عمولة {LEVEL_RATE[row.level]}
                </span>
              </header>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">عدد الأعضاء</dt>
                  <dd className="num font-bold">{row.members}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">أعضاء نشطون</dt>
                  <dd className="num font-bold">{row.active}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">إيداعات الفريق</dt>
                  <dd className="num font-bold">{formatUsdt(row.deposits)} USDT</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">عمولتي</dt>
                  <dd className="num font-bold text-gold">{formatUsdt(row.commission)} USDT</dd>
                </div>
              </dl>
            </article>
          ),
        )}
      </section>
    </div>
  );
}
