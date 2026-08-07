import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "عن المنصة — Quantvine" },
      { name: "description", content: "تعرّف على Quantvine، منصة التداول الكمي الآلي بمستويات VIP وعمولات فريق." },
      { property: "og:title", content: "عن المنصة — Quantvine" },
      { property: "og:description", content: "منصة تداول كمي آلي بعوائد يومية ونظام إحالة." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-4 px-4 pt-5">
      <h1 className="text-lg font-extrabold">عن المنصة</h1>
      <section className="panel space-y-3 p-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Quantvine منصة تداول كمي تعتمد على خوارزميات مطابقة آلية لأزواج العملات الرقمية الرئيسية
          مثل BTC/USDT و ETH/USDT، وتوزّع الأرباح على المستخدمين بشكل يومي حسب مستوى VIP.
        </p>
        <p>
          يعتمد النظام على ثلاثة مستويات عضوية، لكل مستوى عدد مهام يومية ونسبة ربح ومتطلبات رصيد
          مختلفة، بالإضافة إلى برنامج وكلاء بثلاثة مستويات من العمولة.
        </p>
        <p>جميع الإيداعات والسحوبات تتم عبر شبكة USDT TRC-20 وتُراجع يدوياً لضمان الأمان.</p>
      </section>
    </div>
  );
}
