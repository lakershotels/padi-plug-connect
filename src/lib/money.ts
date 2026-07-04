export function formatMoney(kobo: number | null | undefined, currency = "NGN") {
  const amount = (kobo ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₦${amount.toLocaleString()}`;
  }
}

export function nairaToKobo(naira: number) {
  return Math.round(naira * 100);
}
