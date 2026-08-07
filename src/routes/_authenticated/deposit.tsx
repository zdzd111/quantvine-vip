import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Upload } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { createDeposit } from "@/lib/account.functions";
import { useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({
    meta: [
      { title: "تعبئة رصيد — Quantvine" },
      { name: "description", content: "أودع USDT عبر شبكة TRC-20 وارفع صورة إثبات التحويل لمراجعة سريعة." },
      { property: "og:title", content: "تعبئة رصيد — Quantvine" },
      { property: "og:description", content: "إيداع USDT TRC-20 مع رفع إثبات التحويل." },
    ],
  }),
  component: DepositPage,
});

const PRESETS = [50, 100, 300, 500, 1000, 3000];

function DepositPage() {
  const { data } = useAccount();
  const submit = useServerFn(createDeposit);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const wallet = data?.depositWallet ?? "";

  useEffect(() => {
    if (!wallet) return;
    QRCode.toDataURL(wallet, {
      width: 320,
      margin: 1,
      color: { dark: "#F0B90B", light: "#00000000" },
    }).then(setQr);
  }, [wallet]);

  async function handleSubmit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("يُرجى إدخال مبلغ صحيح");
      return;
    }
    if (!file) {
      toast.error("يُرجى رفع صورة إثبات التحويل");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("no user");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      await submit({ data: { amount: value, proofPath: path } });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم إرسال طلب التعبئة، سيتم مراجعته قريباً");
      navigate({ to: "/wallet" });
    } catch {
      toast.error("تعذر إرسال الطلب، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-4 pt-5">
      <h1 className="text-lg font-extrabold">تعبئة رصيد</h1>

      <section className="panel space-y-3 p-4">
        <p className="text-xs font-semibold text-muted-foreground">
          الشبكة: <span className="num text-gold">USDT · TRC-20</span>
        </p>
        <div className="grid place-items-center rounded-xl bg-elevated p-4">
          {qr ? (
            <img src={qr} alt="رمز QR لعنوان الإيداع" className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-lg bg-muted" />
          )}
        </div>
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="text-[11px] text-muted-foreground">عنوان المحفظة</p>
          <p className="num break-all text-xs font-bold">{wallet || "..."}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(wallet);
            toast.success("تم نسخ العنوان");
          }}
          className="gold-surface flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
        >
          <Copy className="h-4 w-4" />
          نسخ العنوان
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <label className="block text-sm font-bold" htmlFor="amount">
          مبلغ التعبئة (USDT)
        </label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          className="num w-full rounded-xl border border-border bg-elevated px-3 py-3 text-base outline-none focus:border-gold"
        />
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="num rounded-lg border border-border bg-elevated py-2 text-sm font-bold"
            >
              {preset}
            </button>
          ))}
        </div>

        <label
          htmlFor="proof"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-elevated py-6 text-sm text-muted-foreground"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : "رفع صورة إثبات التحويل"}
        </label>
        <input
          id="proof"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="gold-surface w-full rounded-xl py-3 text-sm font-black disabled:opacity-50"
        >
          {busy ? "جارٍ الإرسال..." : "إرسال طلب التعبئة"}
        </button>
      </section>
    </div>
  );
}
