import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { saveWithdrawPin } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";
import { SecurityBadges } from "@/components/SecurityBadges";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "مركز الأمان — Quantvine" },
      {
        name: "description",
        content: "مؤشر قوة أمان حسابك، تعيين كلمة مرور السحب ومتابعة سجل الدخول الأخير على Quantvine.",
      },
      { property: "og:title", content: "مركز الأمان — Quantvine" },
      { property: "og:description", content: "حماية حسابك برمز أمان السحب ومتابعة النشاط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { data } = useAccount();
  const queryClient = useQueryClient();
  const save = useServerFn(saveWithdrawPin);
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const hasPin = Boolean(data?.hasWithdrawPin);
  const profile = data?.profile;
  const checks = [
    { label: "كلمة مرور الحساب مفعّلة", ok: true },
    { label: "كلمة مرور السحب (رمز الأمان)", ok: hasPin },
    { label: "البريد الإلكتروني مرتبط بالحساب", ok: Boolean(profile?.email) },
    { label: "عنوان محفظة سحب محفوظ", ok: Boolean(profile?.wallet_address) },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  async function submit() {
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("رمز الأمان يجب أن يكون من 4 إلى 6 أرقام");
      return;
    }
    if (pin !== confirm) {
      toast.error("الرمزان غير متطابقين");
      return;
    }
    setBusy(true);
    try {
      const result = await save({
        data: currentPin ? { pin, currentPin } : { pin },
      });
      if (!result.ok) {
        toast.error(result.reason === "wrong_pin" ? "رمز الأمان الحالي غير صحيح" : "صيغة الرمز غير صالحة");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("تم حفظ رمز أمان السحب بنجاح");
      setCurrentPin("");
      setPin("");
      setConfirm("");
    } catch {
      toast.error("تعذر حفظ الرمز");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold";

  return (
    <div className="space-y-5 px-4 pt-5">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        ملكي
      </Link>
      <h1 className="flex items-center gap-2 text-lg font-extrabold">
        <ShieldCheck className="h-5 w-5 text-gold" />
        مركز الأمان
      </h1>

      <section className="panel space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">مؤشر قوة الأمان</p>
          <span className="num text-sm font-black text-gold">{score}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${score}%` }} />
        </div>
        <ul className="space-y-1.5">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-[11px] font-semibold">
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-black ${
                  check.ok ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                }`}
              >
                {check.ok ? "✓" : "!"}
              </span>
              <span className={check.ok ? "" : "text-muted-foreground"}>{check.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Lock className="h-4 w-4 text-gold" />
          {hasPin ? "تغيير كلمة مرور السحب" : "تعيين كلمة مرور السحب"}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          رمز من 4 إلى 6 أرقام يُطلب في كل عملية سحب لحماية رصيدك.
        </p>
        {hasPin && (
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ""))}
            placeholder="الرمز الحالي"
            maxLength={6}
            className={inputClass}
          />
        )}
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          placeholder="الرمز الجديد"
          maxLength={6}
          className={inputClass}
        />
        <input
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value.replace(/\D/g, ""))}
          placeholder="تأكيد الرمز الجديد"
          maxLength={6}
          className={inputClass}
        />
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="gold-surface w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ..." : "حفظ رمز الأمان"}
        </button>
      </section>

      <section className="panel space-y-1.5 p-4">
        <p className="text-sm font-bold">سجل نشاط الأمان</p>
        <p className="num text-[11px] text-muted-foreground">
          آخر دخول:{" "}
          {profile?.last_login_at
            ? new Date(profile.last_login_at).toLocaleString("en-GB")
            : "لا يوجد سجل بعد"}
        </p>
        <p className="break-all text-[11px] text-muted-foreground">
          الجهاز / المتصفح: {profile?.last_login_agent ?? "غير معروف"}
        </p>
      </section>

      <SecurityBadges />
    </div>
  );
}
