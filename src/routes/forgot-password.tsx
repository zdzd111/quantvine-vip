import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, MailQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور — Quantvine" },
      {
        name: "description",
        content: "أدخل بريدك الإلكتروني لاستلام رابط آمن لإعادة تعيين كلمة مرور حسابك في Quantvine.",
      },
      { property: "og:title", content: "استعادة كلمة المرور — Quantvine" },
      { property: "og:description", content: "إعادة تعيين كلمة مرور حسابك بأمان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!email.includes("@")) {
      toast.error("يُرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("تم إرسال رابط إعادة التعيين إلى بريدك");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الرابط");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-5 px-5 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        تسجيل الدخول
      </Link>
      <header className="text-center">
        <div className="gold-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl">
          <MailQuestion className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-black">نسيت كلمة المرور؟</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.
        </p>
      </header>

      <div className="panel space-y-3 p-5">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="البريد الإلكتروني"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />
        <button
          type="button"
          disabled={busy}
          onClick={send}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
        </button>
        {sent && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-success">
            تحقق من صندوق بريدك (وأيضاً مجلد الرسائل غير المرغوبة) واتبع الرابط لتعيين كلمة مرور جديدة.
          </p>
        )}
      </div>
    </main>
  );
}
