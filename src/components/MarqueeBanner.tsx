import { Megaphone } from "lucide-react";
import { useAccount } from "@/lib/use-account";

const DEFAULT_TEXT =
  "مرحباً بك في Quantvine · أرباح التداول الكمي تُضاف فوراً إلى رصيدك · ادعُ صديقاً يشحن $100 واكسب $7 · تصفير المهام اليومية كل يوم الساعة 11:00 صباحاً";

export function MarqueeBanner() {
  const { data } = useAccount();
  const text = (data?.announcement ?? "").trim() || DEFAULT_TEXT;

  return (
    <div className="panel flex items-center gap-2 overflow-hidden rounded-2xl border border-gold/30 px-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Megaphone className="h-3.5 w-3.5" />
      </span>
      <div className="marquee min-w-0 flex-1">
        <div className="marquee-track text-[11px] font-semibold text-foreground">
          <span className="px-4">{text}</span>
          <span className="px-4" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
