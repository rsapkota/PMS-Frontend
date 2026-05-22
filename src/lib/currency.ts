/**
 * Formats a number as Nepalese Rupee (NPR)
 * Uses the Indian/Nepalese numbering system (Lakh/Crore)
 */
export function formatNPR(amount: number | string): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  
  if (isNaN(numericAmount)) return "Rs. 0";

  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount).replace("NPR", "Rs.");
}
