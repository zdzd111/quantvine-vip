import { useEffect, useState } from "react";
import { Rocket, TrendingUp, Zap, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const KEY = "qv_welcome_seen_v1";

export function WelcomeModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(KEY)) return;
    const timer = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    window.sessionStorage.setItem(KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="panel w-full max-w-sm animate-[scale-in_0.25s_ease-out] overflow-hidden p-5 text-center">
        <div className="gold-surface mx-auto grid h-14 w-14 place-items-center rounded-2xl">
          <Rocket className="h-7 w-7" />
        </div>
        <h2 className="mt-3 text-base font-black leading-snug">{t("welcome.title")}</h2>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{t("welcome.desc")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[TrendingUp, Zap, Users].map((Icon, index) => (
            <div key={index} className="grid place-items-center rounded-xl bg-elevated py-2.5">
              <Icon className="h-4 w-4 text-gold" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="gold-surface mt-5 w-full rounded-xl py-3 text-sm font-black"
        >
          {t("welcome.cta")}
        </button>
      </div>
    </div>
  );
}
