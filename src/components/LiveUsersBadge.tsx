import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MIN = 280;
const MAX = 650;

function seed() {
  return Math.round(MIN + Math.random() * (MAX - MIN));
}

/** Live active-user badge that drifts smoothly and stays within 280–650. */
export function LiveUsersBadge() {
  const { t } = useI18n();
  const [count, setCount] = useState(420);

  useEffect(() => {
    setCount(seed());
    const timer = setInterval(() => {
      setCount((prev) => {
        const step = Math.round((Math.random() - 0.48) * 7);
        let next = prev + step;
        if (next < MIN) next = MIN + Math.round(Math.random() * 6);
        if (next > MAX) next = MAX - Math.round(Math.random() * 6);
        return next;
      });
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-gold/25 bg-elevated px-3 py-1.5 text-[11px] font-bold">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <Users className="h-3.5 w-3.5 text-gold" />
      <span className="num text-gold">{count.toLocaleString("en-US")}</span>
      <span className="text-muted-foreground">{t("home.online")}</span>
    </div>
  );
}
