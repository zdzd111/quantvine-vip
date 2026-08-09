import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Activity, Wallet, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { playTap } from "@/lib/sfx";

const TABS = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/team", key: "nav.team", icon: Users },
  { to: "/quant", key: "nav.quant", icon: Activity },
  { to: "/wallet", key: "nav.wallet", icon: Wallet },
  { to: "/profile", key: "nav.profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ to, key, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                onClick={() => playTap()}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] leading-tight transition-colors ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-gold" : ""}`} />
                <span className="truncate">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
