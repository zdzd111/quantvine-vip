import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SecurityBadges } from "@/components/SecurityBadges";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ClipboardList,
  HelpCircle,
  Info,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";
import { formatUsdt } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملكي — Quantvine" },
      { name: "description", content: "معلومات حسابك، مستوى VIP، أرباحك وعمولاتك وإعدادات الحساب." },
      { property: "og:title", content: "ملكي — Quantvine" },
      { property: "og:description", content: "إدارة حسابك ومتابعة أرباحك على منصة Quantvine." },
    ],
  }),
  component: ProfilePage,
});

const LINKS = [
  { label: "مركز المهام", icon: ClipboardList, to: "/quant" as const },
  { label: "فريقي", icon: Users, to: "/team" as const },
  { label: "مشكلة شائعة", icon: HelpCircle, to: "/faq" as const },
  { label: "عن المنصة", icon: Info, to: "/about" as const },
];

function ProfilePage() {
  const { data } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = data?.profile;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <section className="panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
        <span className="gold-surface grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-black">
          {(profile?.username ?? "Q").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{profile?.username ?? "..."}</p>
          <p className="num text-[11px] text-muted-foreground">ID: {profile?.public_id ?? "..."}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-xs font-black text-accent-foreground">
          VIP{profile?.vip_level ?? 1}
        </span>
      </section>

      <section className="panel gold-surface p-4">
        <p className="text-xs font-semibold opacity-80">إجمالي الأصول (USDT)</p>
        <p className="num mt-1 text-3xl font-black">{formatUsdt(profile?.balance ?? 0)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["إجمالي الإيرادات", profile?.total_revenue ?? 0],
            ["أرباح الأمس", profile?.yesterday_earnings ?? 0],
            ["أرباح اليوم", profile?.today_earnings ?? 0],
            ["عمولة الفريق", profile?.today_commission ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-primary-foreground/10 p-2.5">
              <p className="text-[10px] font-semibold opacity-80">{label}</p>
              <p className="num text-sm font-black">{formatUsdt(Number(value))}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/deposit"
          className="gold-surface flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
        >
          <ArrowDownToLine className="h-4 w-4" />
          تعبئة رصيد
        </Link>
        <Link
          to="/withdraw"
          className="flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-card py-3 text-sm font-bold text-gold"
        >
          <ArrowUpFromLine className="h-4 w-4" />
          ينسحب
        </Link>
      </section>

      <section className="panel overflow-hidden">
        <Link
          to="/history"
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5 text-sm"
        >
          <ReceiptText className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate font-semibold">سجل المعاملات</span>
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
        <Link
          to="/security"
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5 text-sm"
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate font-semibold">مركز الأمان</span>
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
        {LINKS.map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5 text-sm last:border-0"
          >
            <Icon className="h-4 w-4 shrink-0 text-gold" />
            <span className="truncate font-semibold">{label}</span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        {data?.isAdmin && (
          <Link
            to="/admin"
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3.5 text-sm"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
            <span className="truncate font-semibold">لوحة تحكم الأدمن</span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </section>

      <SecurityActivity
        email={profile?.email ?? null}
        lastLoginAt={profile?.last_login_at ?? null}
        lastLoginAgent={profile?.last_login_agent ?? null}
      />

      <ChangeEmail currentEmail={profile?.email ?? null} />

      <ChangePassword />

      <LanguageSwitcher />


      <SecurityBadges />

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-destructive"
      >
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </button>
    </div>
  );
}

function ChangePassword() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (next.length < 6) {
      toast.error(t("profile.password_short"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("profile.password_mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("no email");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInError) {
        toast.error(t("profile.password_wrong"));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success(t("profile.password_ok"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      toast.error(t("profile.password_wrong"));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold";

  return (
    <section className="panel space-y-2 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <KeyRound className="h-4 w-4 text-gold" />
        {t("profile.change_password")}
      </p>
      <input
        type="password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        placeholder={t("profile.current_password")}
        className={inputClass}
      />
      <input
        type="password"
        value={next}
        onChange={(event) => setNext(event.target.value)}
        placeholder={t("profile.new_password")}
        className={inputClass}
      />
      <input
        type="password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        placeholder={t("profile.confirm_password")}
        className={inputClass}
      />
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="gold-surface w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-50"
      >
        {busy ? t("common.sending") : t("profile.save_password")}
      </button>
    </section>
  );
}

function SecurityActivity({
  email,
  lastLoginAt,
  lastLoginAgent,
}: {
  email: string | null;
  lastLoginAt: string | null;
  lastLoginAgent: string | null;
}) {
  return (
    <section className="panel space-y-1.5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <MonitorSmartphone className="h-4 w-4 text-gold" />
        سجل نشاط الأمان
      </p>
      <p className="num break-all text-[11px] text-muted-foreground">
        البريد الإلكتروني: {email ?? "غير محدد"}
      </p>
      <p className="num text-[11px] text-muted-foreground">
        آخر دخول: {lastLoginAt ? new Date(lastLoginAt).toLocaleString("en-GB") : "لا يوجد سجل بعد"}
      </p>
      <p className="break-all text-[11px] text-muted-foreground">
        الجهاز / المتصفح: {lastLoginAgent ?? "غير معروف"}
      </p>
      <Link to="/security" className="inline-block pt-1 text-[11px] font-black text-gold">
        الانتقال إلى مركز الأمان ←
      </Link>
    </section>
  );
}

function ChangeEmail({ currentEmail }: { currentEmail: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = email.trim();
    if (!value.includes("@") || value.length < 6) {
      toast.error("يُرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    if (value === currentEmail) {
      toast.error("هذا هو بريدك الحالي");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: value },
        { emailRedirectTo: window.location.origin },
      );
      if (error) throw error;
      toast.success("تم إرسال رسالة تحقق إلى بريدك الجديد لتأكيد التغيير");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث البريد الإلكتروني");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel space-y-2 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Mail className="h-4 w-4 text-gold" />
        تغيير البريد الإلكتروني
      </p>
      <p className="num text-[11px] text-muted-foreground">الحالي: {currentEmail ?? "غير محدد"}</p>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="البريد الإلكتروني الجديد"
        className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
      />
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="gold-surface w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
      </button>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        سيتم إرسال رابط/رمز تحقق إلى البريد الجديد، ولن يتم التغيير قبل تأكيده.
      </p>
    </section>
  );
}
