export type NetworkId = "trc20" | "bep20";

export const NETWORKS: Array<{
  id: NetworkId;
  label: string;
  chain: string;
  address: string;
  validate: (value: string) => boolean;
}> = [
  {
    id: "trc20",
    label: "USDT (TRC-20)",
    chain: "Tron",
    address: "TViGZNqLGyULeNik7DfBp3sMKRM8j7jfpH",
    validate: (value) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.trim()),
  },
  {
    id: "bep20",
    label: "USDT (BEP-20)",
    chain: "BNB Smart Chain",
    address: "0xEC2FB4d9C88F36Fc59dBaEF69beb4a8C44209930",
    validate: (value) => /^0x[a-fA-F0-9]{40}$/.test(value.trim()),
  },
];

export const getNetwork = (id: NetworkId) => NETWORKS.find((n) => n.id === id) ?? NETWORKS[0]!;

export const DEPOSIT_PRESETS = [35, 100, 300, 500, 1000, 3000];
export const MIN_QUANT_BALANCE = 35;
export const MIN_WITHDRAW = 10;
export const WITHDRAW_FEE_RATE = 0.03;
