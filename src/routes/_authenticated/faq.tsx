import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/faq")({
  head: () => ({
    meta: [
      { title: "مشكلة شائعة — Quantvine" },
      { name: "description", content: "أجوبة عن أكثر الأسئلة تكراراً حول التكميم، الإيداع، السحب وعمولات الفريق." },
      { property: "og:title", content: "مشكلة شائعة — Quantvine" },
      { property: "og:description", content: "الأسئلة الشائعة حول منصة Quantvine." },
    ],
  }),
  component: FaqPage,
});

const ITEMS = [
  {
    q: "كيف يعمل التداول الكمي؟",
    a: "يقوم النظام بمطابقة أوامر السوق تلقائياً خلال ثلاث ثوانٍ ثم يُضاف الربح إلى رصيدك حسب نسبة مستوى VIP.",
  },
  {
    q: "متى تتجدد مرات التكميم؟",
    a: "تتجدد المهام اليومية كل يوم بعد الساعة 11:00 AM.",
  },
  {
    q: "كم يستغرق الإيداع؟",
    a: "بعد رفع إثبات التحويل تتم المراجعة يدوياً ويُضاف الرصيد عادةً خلال دقائق.",
  },
  {
    q: "ما هي شبكة السحب المدعومة؟",
    a: "يتم السحب عبر شبكة USDT TRC-20 فقط، والحد الأدنى 10 USDT.",
  },
  {
    q: "كيف أحسب عمولة الفريق؟",
    a: "تحصل على 21% من المستوى الأول، 7% من الثاني و3% من الثالث من أرباح تكميم فريقك.",
  },
];

function FaqPage() {
  return (
    <div className="space-y-4 px-4 pt-5">
      <h1 className="text-lg font-extrabold">مشكلة شائعة</h1>
      <div className="panel overflow-hidden">
        {ITEMS.map((item) => (
          <details key={item.q} className="border-b border-border px-4 py-3 last:border-0">
            <summary className="cursor-pointer text-sm font-bold">{item.q}</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
