import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — Quantvine" },
      {
        name: "description",
        content: "اختر كلمة مرور جديدة قوية لحسابك في منصة Quantvine وأكمل تسجيل الدخول بأمان.",
      },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — Quantvine" },
      { property: "og:description", content: "إنهاء عملية إعادة تعيين كلمة المرور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    if (next.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (next !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث كلمة المرور");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-5 px-5 py-10">
      <header className="text-center">
        <div className="gold-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-black">تعيين كلمة مرور جديدة</h1>
      </header>

      <div className="panel space-y-3 p-5">
        {!ready && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-destructive">
            هذا الرابط غير صالح أو انتهت صلاحيته. يُرجى طلب رابط إعادة تعيين جديد.
          </p>
        )}
        <input
          type="password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          placeholder="كلمة المرور الجديدة"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="تأكيد كلمة المرور"
          className={inputClass}
        />
        <button
          type="button"
          disabled={busy || !ready}
          onClick={save}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </div>
    </main>
  );
}
