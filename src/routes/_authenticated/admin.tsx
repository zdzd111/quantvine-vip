import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight, ShieldCheck } from "lucide-react";
import {
  adjustBalance,
  approveDeposit,
  approveWithdrawal,
  claimAdminRole,
  fetchAdminOverview,
  fetchAdminRequests,
  fetchAdminUsers,
  rejectRequest,
  setSetting,
  setUserVip,
} from "@/lib/admin.functions";
import { formatUsdt } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الأدمن — Quantvine" },
      { name: "description", content: "إدارة طلبات الإيداع والسحب، أرصدة المستخدمين ومستويات VIP والإعدادات العامة." },
      { property: "og:title", content: "لوحة تحكم الأدمن — Quantvine" },
      { property: "og:description", content: "إدارة كاملة لمنصة Quantvine." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tab = "deposit" | "withdrawal" | "users" | "settings";

function AdminPage() {
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(fetchAdminOverview);
  const requestsFn = useServerFn(fetchAdminRequests);
  const usersFn = useServerFn(fetchAdminUsers);
  const claim = useServerFn(claimAdminRole);
  const approveDepositFn = useServerFn(approveDeposit);
  const approveWithdrawalFn = useServerFn(approveWithdrawal);
  const rejectFn = useServerFn(rejectRequest);
  const adjustFn = useServerFn(adjustBalance);
  const vipFn = useServerFn(setUserVip);
  const settingFn = useServerFn(setSetting);

  const [tab, setTab] = useState<Tab>("deposit");
  const [search, setSearch] = useState("");

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => overviewFn(),
    retry: false,
  });

  const requests = useQuery({
    queryKey: ["admin", "requests", tab],
    queryFn: () => requestsFn({ data: { type: tab as "deposit" | "withdrawal" } }),
    enabled: tab === "deposit" || tab === "withdrawal",
  });

  const users = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => usersFn({ data: { search } }),
    enabled: tab === "users",
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  async function act(fn: () => Promise<unknown>, message: string) {
    try {
      await fn();
      toast.success(message);
      await refresh();
    } catch {
      toast.error("تعذر تنفيذ العملية");
    }
  }

  if (overview.isError) {
    return (
      <div className="space-y-4 px-4 pt-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-gold" />
        <h1 className="text-lg font-extrabold">لوحة تحكم الأدمن</h1>
        <p className="text-sm text-muted-foreground">
          هذا الحساب لا يملك صلاحيات الإدارة. يمكن للحساب الأول فقط تفعيل صلاحية الأدمن.
        </p>
        <button
          type="button"
          onClick={async () => {
            const result = await claim();
            if (result.ok) {
              toast.success("تم تفعيل صلاحية الأدمن");
              await refresh();
              await overview.refetch();
            } else {
              toast.error("تم تعيين أدمن للمنصة مسبقاً");
            }
          }}
          className="gold-surface mx-auto block rounded-xl px-6 py-3 text-sm font-black"
        >
          تفعيل صلاحية الأدمن
        </button>
        <Link to="/home" className="block text-xs font-bold text-gold">
          العودة للصفحة الأمامية
        </Link>
      </div>
    );
  }

  const stats = overview.data;

  return (
    <div className="space-y-5 px-4 pt-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-extrabold">
          <ShieldCheck className="h-5 w-5 shrink-0 text-gold" />
          <span className="truncate">لوحة تحكم الأدمن</span>
        </h1>
        <Link to="/home" className="shrink-0 text-xs font-bold text-gold">
          التطبيق
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {[
          ["عدد المستخدمين", stats?.users ?? 0, false],
          ["إيداعات مؤكدة", stats?.depositVolume ?? 0, true],
          ["إيداعات معلّقة", stats?.pendingDeposits ?? 0, false],
          ["سحوبات معلّقة", stats?.pendingWithdrawals ?? 0, false],
        ].map(([label, value, money]) => (
          <div key={String(label)} className="panel p-3">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="num text-lg font-black text-gold">
              {money ? formatUsdt(Number(value)) : String(value)}
            </p>
          </div>
        ))}
      </section>

      <nav className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 text-xs font-bold">
        {(
          [
            ["deposit", "الإيداعات"],
            ["withdrawal", "السحوبات"],
            ["users", "المستخدمون"],
            ["settings", "الإعدادات"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg py-2 ${tab === key ? "gold-surface" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {(tab === "deposit" || tab === "withdrawal") && (
        <section className="space-y-3">
          {!requests.data?.length ? (
            <p className="panel px-4 py-8 text-center text-sm text-muted-foreground">
              لا توجد طلبات معلّقة
            </p>
          ) : (
            requests.data.map((row) => (
              <article key={row.id} className="panel space-y-3 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{row.user?.username ?? "مستخدم"}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      ID: {row.user?.public_id ?? "-"}
                    </p>
                    <p className="num text-[11px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <p className="num shrink-0 text-lg font-black text-gold">
                    {formatUsdt(row.amount)}
                  </p>
                </div>
                {row.wallet_address && (
                  <p className="num break-all rounded-lg bg-elevated p-2 text-[11px]">
                    {row.wallet_address}
                  </p>
                )}
                {row.proof_path && (
                  <p className="num break-all text-[11px] text-muted-foreground">
                    إثبات: {row.proof_path}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      act(
                        () =>
                          tab === "deposit"
                            ? approveDepositFn({
                                data: { txId: row.id, amount: Number(row.amount) },
                              })
                            : approveWithdrawalFn({ data: { txId: row.id } }),
                        "تم قبول الطلب",
                      )
                    }
                    className="gold-surface rounded-xl py-2.5 text-sm font-bold"
                  >
                    قبول
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => rejectFn({ data: { txId: row.id } }), "تم رفض الطلب")}
                    className="rounded-xl border border-destructive/50 py-2.5 text-sm font-bold text-destructive"
                  >
                    رفض
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "users" && (
        <section className="space-y-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم أو المعرف"
            className="w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
          />
          {(users.data ?? []).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onAdjust={(delta) =>
                act(
                  () => adjustFn({ data: { targetId: user.id, delta } }),
                  "تم تعديل الرصيد",
                )
              }
              onVip={(level) =>
                act(() => vipFn({ data: { targetId: user.id, level } }), "تم تحديث مستوى VIP")
              }
            />
          ))}
        </section>
      )}

      {tab === "settings" && (
        <SettingsPanel
          wallet={stats?.depositWallet ?? ""}
          adjust={stats?.profitAdjust ?? "0"}
          onSave={(key, value) =>
            act(() => settingFn({ data: { key, value } }), "تم حفظ الإعداد")
          }
        />
      )}
    </div>
  );
}

type AdminUser = {
  id: string;
  username: string;
  public_id: string;
  vip_level: number;
  balance: number;
};

function UserCard({
  user,
  onAdjust,
  onVip,
}: {
  user: AdminUser;
  onAdjust: (delta: number) => void;
  onVip: (level: number) => void;
}) {
  const [delta, setDelta] = useState("");

  return (
    <article className="panel space-y-3 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user.username}</p>
          <p className="num text-[11px] text-muted-foreground">ID: {user.public_id}</p>
        </div>
        <p className="num shrink-0 text-base font-black text-gold">{formatUsdt(user.balance)}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          type="number"
          placeholder="مبلغ (+/-)"
          className="num w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => {
            const value = Number(delta);
            if (!Number.isFinite(value) || value === 0) {
              toast.error("أدخل مبلغاً صحيحاً");
              return;
            }
            onAdjust(value);
            setDelta("");
          }}
          className="gold-surface flex shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-bold"
        >
          تعديل
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onVip(level)}
            className={`num rounded-lg py-2 text-xs font-bold ${
              user.vip_level === level
                ? "gold-surface"
                : "border border-border bg-elevated text-muted-foreground"
            }`}
          >
            VIP{level}
          </button>
        ))}
      </div>
    </article>
  );
}

function SettingsPanel({
  wallet,
  adjust,
  onSave,
}: {
  wallet: string;
  adjust: string;
  onSave: (key: "deposit_wallet" | "profit_adjust", value: string) => void;
}) {
  const [walletValue, setWalletValue] = useState(wallet);
  const [adjustValue, setAdjustValue] = useState(adjust);

  return (
    <section className="panel space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-sm font-bold" htmlFor="wallet-setting">
          عنوان محفظة الإيداع (TRC-20)
        </label>
        <input
          id="wallet-setting"
          value={walletValue}
          onChange={(event) => setWalletValue(event.target.value)}
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-xs outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => onSave("deposit_wallet", walletValue.trim())}
          className="gold-surface w-full rounded-xl py-2.5 text-sm font-bold"
        >
          حفظ العنوان
        </button>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <label className="text-sm font-bold" htmlFor="adjust-setting">
          معامل تعديل الأرباح العام (%)
        </label>
        <input
          id="adjust-setting"
          type="number"
          value={adjustValue}
          onChange={(event) => setAdjustValue(event.target.value)}
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm outline-none focus:border-gold"
        />
        <p className="text-[11px] text-muted-foreground">
          قيمة موجبة تزيد نسبة الربح لكل عمليات التكميم، وقيمة سالبة تخفضها.
        </p>
        <button
          type="button"
          onClick={() => onSave("profit_adjust", adjustValue)}
          className="gold-surface w-full rounded-xl py-2.5 text-sm font-bold"
        >
          حفظ المعامل
        </button>
      </div>
    </section>
  );
}
