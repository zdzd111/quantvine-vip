import { Megaphone } from "lucide-react";
import { useAccount } from "@/lib/use-account";

const DEFAULT_TEXT =
  "مرحباً بك في كوانتفاين - أرباح التكميم اليومية تتجدد الساعة 11:00 AM";

export function MarqueeBanner() {
  const { data } = useAccount();
  const text = (data?.announcement ?? "").trim() || DEFAULT_TEXT;

  return (
    <div className="panel flex items-center gap-2 rounded-2xl border border-gold/30 px-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Megaphone className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 flex-1 text-[11px] font-semibold leading-relaxed text-foreground">
        {text}
      </p>
    </div>
  );
}
