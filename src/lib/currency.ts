export const currencies = ["IDR", "JPY", "USD"] as const;
export type Currency = (typeof currencies)[number];
export const currencyLabels: Record<Currency, string> = {
  IDR: "IDR — Rupiah Indonesia",
  JPY: "JPY — Yen Jepang",
  USD: "USD — Dolar AS",
};
export const currencyDecimals = (currency: Currency) =>
  currency === "USD" ? 2 : 0;
export const currencyStep = (currency: Currency) =>
  currency === "USD" ? "0.01" : "1";
export const validPrecision = (value: number, currency: Currency) => {
  const factor = 10 ** currencyDecimals(currency);
  return (
    Number.isFinite(value) && Math.round(value * factor) / factor === value
  );
};
export function purchaseSubtotal(
  quantity: number,
  unitPrice: number,
  currency: Currency = "IDR",
) {
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    quantity < 0 ||
    unitPrice < 0 ||
    unitPrice > 1_000_000_000_000 ||
    quantity > 1_000_000
  )
    return NaN;
  const factor = 10 ** currencyDecimals(currency);
  // Multiply decimal quantities in minor units so rounding matches Postgres numeric.
  const [coefficient, exponent = "0"] = String(quantity).split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  const scale = fraction.length - Number(exponent);
  let numerator =
    BigInt(whole + fraction) * BigInt(Math.round(unitPrice * factor));
  const denominator = scale > 0 ? BigInt(10) ** BigInt(scale) : BigInt(1);
  if (scale < 0) numerator *= BigInt(10) ** BigInt(-scale);
  return Number((numerator + denominator / BigInt(2)) / denominator) / factor;
}
export const sumMoney = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
export const formatMoney = (value: number, currency: Currency = "IDR") =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: currencyDecimals(currency),
    maximumFractionDigits: currencyDecimals(currency),
  }).format(value);
