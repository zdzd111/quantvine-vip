import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { NETWORKS } from "./networks";
import { getSetting } from "./account.server";
import { settleDeposit } from "./admin.server";

/** Public, key-less endpoints used to watch the platform deposit wallets. */
const TRON_API = "https://api.trongrid.io";
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const BSC_RPC = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://rpc.ankr.com/bsc",
];
const BSC_USDT = "0x55d398326f99059ff775485246999027b3197955";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Deposits older than this are no longer auto-matched. */
const MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ChainTransfer = { hash: string; amount: number; at: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<any>;
}

/** Incoming USDT TRC-20 transfers to `address` (public TronGrid, no API key). */
export async function tronIncoming(address: string): Promise<ChainTransfer[]> {
  try {
    const url = `${TRON_API}/v1/accounts/${address}/transactions/trc20?only_to=true&limit=50&contract_address=${TRON_USDT}`;
    const body = await json(url);
    return (body?.data ?? [])
      .filter((row: any) => (row?.to ?? "").toLowerCase() === address.toLowerCase())
      .map((row: any) => ({
        hash: String(row.transaction_id),
        amount: round2(Number(row.value) / 1e6),
        at: Number(row.block_timestamp ?? 0),
      }))
      .filter((t: ChainTransfer) => t.amount > 0 && t.hash);
  } catch {
    return [];
  }
}

async function bscRpc(method: string, params: unknown[]) {
  for (const endpoint of BSC_RPC) {
    try {
      const body = await json(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (body?.result !== undefined) return body.result;
    } catch {
      // try the next public RPC
    }
  }
  return null;
}

/** Incoming USDT BEP-20 transfers to `address` (public BSC RPC, no API key). */
export async function bscIncoming(address: string): Promise<ChainTransfer[]> {
  const latestHex = await bscRpc("eth_blockNumber", []);
  if (!latestHex) return [];
  const latest = Number(latestHex);
  // ~3h of blocks (3s each) keeps the log range inside public RPC limits.
  const from = Math.max(0, latest - 3000);
  const topicAddress = `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
  const logs = await bscRpc("eth_getLogs", [
    {
      address: BSC_USDT,
      topics: [TRANSFER_TOPIC, null, topicAddress],
      fromBlock: `0x${from.toString(16)}`,
      toBlock: "latest",
    },
  ]);
  if (!Array.isArray(logs)) return [];
  return logs
    .map((log: any) => ({
      hash: String(log.transactionHash),
      amount: round2(Number(BigInt(log.data ?? "0x0")) / 1e18),
      at: Date.now(),
    }))
    .filter((t: ChainTransfer) => t.amount > 0 && t.hash);
}

async function walletFor(network: "trc20" | "bep20") {
  const fallback = NETWORKS.find((n) => n.id === network)!.address;
  return (await getSetting(`deposit_wallet_${network}`)) || fallback;
}

/**
 * Matches on-chain transfers against pending deposit requests and credits the
 * member automatically. Idempotent: each transaction hash is consumed once.
 */
export async function syncDeposits() {
  const since = new Date(Date.now() - MATCH_WINDOW_MS).toISOString();
  const { data: pending } = await supabaseAdmin
    .from("transactions")
    .select("id, user_id, amount, note, created_at")
    .eq("type", "deposit")
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const requests = pending ?? [];
  if (!requests.length) return { checked: 0, credited: 0 };

  const [trcWallet, bepWallet] = await Promise.all([walletFor("trc20"), walletFor("bep20")]);
  const [trc, bep] = await Promise.all([tronIncoming(trcWallet), bscIncoming(bepWallet)]);
  const transfers = [...trc, ...bep];
  if (!transfers.length) return { checked: requests.length, credited: 0 };

  const hashes = transfers.map((t) => `auto:${t.hash}`);
  const { data: used } = await supabaseAdmin
    .from("transactions")
    .select("note")
    .in("note", hashes);
  const consumed = new Set((used ?? []).map((r) => r.note));

  let credited = 0;
  for (const request of requests) {
    const requested = Number(request.amount);
    const createdAt = new Date(request.created_at).getTime();
    const match = transfers.find((t) => {
      if (consumed.has(`auto:${t.hash}`)) return false;
      if (t.at && t.at < createdAt - 30 * 60 * 1000) return false;
      const diff = Math.abs(t.amount - requested);
      return diff <= Math.max(0.5, requested * 0.01);
    });
    if (!match) continue;
    consumed.add(`auto:${match.hash}`);
    await settleDeposit(request.id, match.amount, `auto:${match.hash}`);
    credited += 1;
  }
  return { checked: requests.length, credited };
}
