import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ClipboardList,
  HelpCircle,
  Info,
  LogOut,
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
          <p className="num text-[11px] text-muted-foreground">ID: {profile?.invite_code ?? "..."}</p>
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
            ["عمولة الفريق", profile?.total_commission ?? 0],
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
