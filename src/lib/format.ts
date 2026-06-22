export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("ar-PS", {
    style: "currency",
    currency: "ILS",
  }).format(cents / 100);
}
