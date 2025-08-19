export function formatPrice(amount: number, currency: string = "CRC") {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0, // remove decimals for CRC
  }).format(amount);
}