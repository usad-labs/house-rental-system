import { siteConfig } from "@/config/site";

/** Format whole currency units, e.g. 12000 → "₱12,000". */
export function formatMoney(
  amount: number,
  currency: { code: string; locale: string } = siteConfig.currency,
): string {
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
