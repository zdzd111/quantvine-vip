import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchNotifications, readNotifications } from "@/lib/account.functions";
import { useI18n } from "@/lib/i18n";

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const load = useServerFn(fetchNotifications);
  const markRead = useServerFn(readNotifications);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => load(),
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markRead({});
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("home.notifications")}
        onClick={toggle}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="num absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="panel absolute end-0 top-11 z-50 w-72 overflow-hidden">
            <p className="border-b border-border px-3 py-2 text-xs font-bold">
              {t("home.notifications")}
            </p>
            {!items.length ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t("home.no_notifications")}
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-border px-3 py-2.5 last:border-0">
                    <div className="flex items-start gap-2">
                      {!item.is_read && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black">{item.title}</p>
                        <p className="text-[11px] font-semibold leading-snug text-muted-foreground">
                          {item.body}
                        </p>
                        <p className="num mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
