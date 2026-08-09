import { Globe } from "lucide-react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="panel space-y-2 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Globe className="h-4 w-4 text-gold" />
        {t("common.language")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code as Lang)}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
              lang === item.code
                ? "gold-surface border-transparent"
                : "border-border bg-elevated text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
