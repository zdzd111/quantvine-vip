import { useI18n } from "@/lib/i18n";

const STEPS = ["tx.received", "tx.review", "tx.done"] as const;

export function TxProgress({ status }: { status: string }) {
  const { t } = useI18n();
  const rejected = status === "rejected";
  const current = rejected ? 1 : status === "approved" ? 2 : 1;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        {STEPS.map((step, index) => {
          const reached = index <= current;
          const failed = rejected && index === 2;
          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-center">
                <span
                  className={`h-1 flex-1 rounded-full ${index === 0 ? "opacity-0" : reached && !failed ? "bg-gold" : "bg-muted"}`}
                />
                <span
                  className={`num grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-black ${
                    failed
                      ? "bg-destructive text-destructive-foreground"
                      : reached
                        ? "gold-surface"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`h-1 flex-1 rounded-full ${index === STEPS.length - 1 ? "opacity-0" : reached && !failed ? "bg-gold" : "bg-muted"}`}
                />
              </div>
              <span
                className={`text-[9px] font-bold leading-none ${
                  failed ? "text-destructive" : reached ? "text-gold" : "text-muted-foreground"
                }`}
              >
                {failed ? t("tx.rejected") : t(step)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
