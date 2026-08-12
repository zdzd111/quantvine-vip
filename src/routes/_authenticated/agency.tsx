import { createFileRoute, Link } from "@tanstack/react-router";
import { Handshake } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({
    meta: [
      { title: "تعاون وكيل — Quantvine" },
      { name: "description", content: "قواعد عمولة الوكلاء على ثلاثة مستويات في منصة Quantvine." },
      { property: "og:title", content: "تعاون وكيل — Quantvine" },
      { property: "og:description", content: "اربح عمولة من إيداعات وأرباح فريقك على ثلاثة مستويات." },
    ],
  }),
  component: AgencyPage,
});

const TIERS = [
  { level: "Level1 المرؤوس", quant: "21%", deposit: "5%" },
  { level: "Level2 المرؤوس", quant: "7%", deposit: "3%" },
  { level: "Level3 المرؤوس", quant: "3%", deposit: "1%" },
];

function AgencyPage() {
  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <Handshake className="h-5 w-5 text-gold" />
        تعاون وكيل
      </h1>

      <section className="panel p-4 text-sm leading-relaxed text-muted-foreground">
        انضم إلى برنامج الوكلاء واحصل على عمولة تلقائية من كل عضو ينضم عبر رابط الدعوة الخاص بك،
        على ثلاثة مستويات، وتُضاف العمولة إلى رصيدك مباشرة.
      </section>

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-3 border-b border-border bg-elevated px-4 py-3 text-[11px] font-bold text-muted-foreground">
          <span>المستوى</span>
          <span className="text-center">عمولة التكميم</span>
          <span className="text-center">عمولة الإيداع</span>
        </div>
        {TIERS.map((tier) => (
          <div
            key={tier.level}
            className="grid grid-cols-3 items-center border-b border-border px-4 py-3 text-sm last:border-0"
          >
            <span className="truncate font-bold">{tier.level}</span>
            <span className="num text-center font-black text-gold">{tier.quant}</span>
            <span className="num text-center font-black">{tier.deposit}</span>
          </div>
        ))}
      </section>

      <Link
        to="/team"
        className="gold-surface block rounded-xl py-3 text-center text-sm font-bold"
      >
        ادعو أصدقاء الآن
      </Link>
    </div>
  );
}
