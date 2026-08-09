import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SecurityBadges() {
  const { t } = useI18n();
  const items = [
    { icon: Lock, key: "sec.ssl" },
    { icon: ShieldCheck, key: "sec.enc" },
    { icon: Clock, key: "sec.protect" },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ icon: Icon, key }) => (
        <div
          key={key}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-2.5 text-center"
        >
          <Icon className="h-4 w-4 text-gold" />
          <span className="text-[10px] font-bold leading-tight text-muted-foreground">{t(key)}</span>
        </div>
      ))}
    </div>
  );
}
