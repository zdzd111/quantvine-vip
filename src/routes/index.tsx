import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantvine — منصة التداول الكمي بالذكاء الآلي" },
      {
        name: "description",
        content:
          "سجّل في Quantvine وابدأ التداول الكمي اليومي على USDT مع مستويات VIP وعمولات فريق من ثلاثة مستويات.",
      },
      { property: "og:title", content: "Quantvine — منصة التداول الكمي" },
      {
        property: "og:description",
        content: "تداول كمي آلي، أرباح يومية ونظام إحالة بثلاثة مستويات.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      setInvite(code);
      setMode("signup");
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/home", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      toast.error("يُرجى إدخال بريد إلكتروني وكلمة مرور (6 أحرف على الأقل)");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        if (username.trim().length < 3) {
          toast.error("اسم المستخدم قصير جداً");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim(), invite_code: invite.trim() || null },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <div className="gold-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl text-2xl font-black">
          Q
        </div>
        <h1 className="gold-text mt-3 text-3xl font-black tracking-tight">Quantvine</h1>
        <p className="mt-2 text-sm text-muted-foreground">منصة التداول الكمي الآلي · USDT</p>
      </header>

      <div className="panel space-y-3 p-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-elevated p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg py-2 ${mode === "login" ? "gold-surface" : "text-muted-foreground"}`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg py-2 ${mode === "signup" ? "gold-surface" : "text-muted-foreground"}`}
          >
            إنشاء حساب
          </button>
        </div>

        {mode === "signup" && (
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="اسم المستخدم"
            className="w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
          />
        )}
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="البريد الإلكتروني"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="كلمة المرور"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />
        {mode === "signup" && (
          <input
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            placeholder="كود الدعوة (اختياري)"
            className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
          />
        )}

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ المعالجة..." : mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        </button>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        الإيداع والسحب عبر شبكة USDT TRC-20 · العوائد تعتمد على مستوى VIP وأداء السوق.
      </p>
    </main>
  );
}
