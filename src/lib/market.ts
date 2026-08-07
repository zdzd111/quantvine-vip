export type MarketRow = {
  symbol: string;
  price: number;
  change: number;
};

const BASE: Array<{ symbol: string; price: number }> = [
  { symbol: "BTC/USDT", price: 67432.15 },
  { symbol: "ETH/USDT", price: 3521.44 },
  { symbol: "LTC/USDT", price: 84.27 },
  { symbol: "DOT/USDT", price: 7.153 },
  { symbol: "LINK/USDT", price: 17.482 },
  { symbol: "ADA/USDT", price: 0.4721 },
];

function drift(seed: number) {
  return Math.sin(seed) * 0.5 + (Math.random() - 0.5) * 0.4;
}

export function buildMarket(prev?: MarketRow[]): MarketRow[] {
  return BASE.map((base, index) => {
    const previous = prev?.[index];
    const changePct = drift(Date.now() / 90000 + index) * 3;
    const price = previous
      ? previous.price * (1 + (Math.random() - 0.5) * 0.0016)
      : base.price;
    return {
      symbol: base.symbol,
      price,
      change: previous ? previous.change * 0.85 + changePct * 0.15 : changePct,
    };
  });
}

const NAME_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function maskedName() {
  const pick = () => NAME_CHARS[Math.floor(Math.random() * NAME_CHARS.length)];
  return `${pick()}${pick()}***${pick()}`;
}

export type FeedRow = { id: string; user: string; amount: string };

export function buildFeed(count = 14): FeedRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    user: maskedName(),
    amount: (Math.random() * 480 + 12).toFixed(2),
  }));
}

export const formatUsdt = (value: number | string) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatPrice = (value: number) =>
  value >= 100
    ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toFixed(4);
