import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Activity, Wallet, User } from "lucide-react";

const TABS = [
  { to: "/home", label: "الصفحة الأمامية", icon: Home },
  { to: "/team", label: "فريقي", icon: Users },
  { to: "/quant", label: "تحديد الكمية", icon: Activity },
  { to: "/wallet", label: "المحفظة المالية", icon: Wallet },
  { to: "/profile", label: "ملكي", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] leading-tight transition-colors ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-gold" : ""}`} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
