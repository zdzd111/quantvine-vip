import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { logLogin } from "@/lib/account.functions";
import { BottomNav } from "@/components/BottomNav";
import { WelcomeModal } from "@/components/WelcomeModal";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  const record = useServerFn(logLogin);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    const key = "qv-login-logged";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void record({ data: { agent: navigator.userAgent.slice(0, 200) } });
  }, [record]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg bg-background">
      <div className={isAdmin ? "pb-6" : "pb-24"}>
        <Outlet />
      </div>
      {!isAdmin && <BottomNav />}
      {!isAdmin && <WelcomeModal />}
    </div>
  );
}

