export interface InvoiceAllocationItem {
  invoiceId: string;
  dueDate: string;
  outstandingAmount: number;
}

export interface PaymentAllocationLine {
  invoiceId: string;
  allocatedAmount: number;
}

export interface PaymentAllocationResult {
  allocations: PaymentAllocationLine[];
  totalAllocated: number;
  remainingCredit: number;
}

function asTime(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

export function allocatePaymentFIFO(
  amount: number,
  invoices: InvoiceAllocationItem[]
): PaymentAllocationResult {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const sorted = [...invoices]
    .filter((i) => i.outstandingAmount > 0)
    .sort((a, b) => {
      const dt = asTime(a.dueDate) - asTime(b.dueDate);
      if (dt !== 0) return dt;
      return a.invoiceId.localeCompare(b.invoiceId);
    });

  let remaining = safeAmount;
  const allocations: PaymentAllocationLine[] = [];

  for (const invoice of sorted) {
    if (remaining <= 0) break;
    const applied = Math.min(invoice.outstandingAmount, remaining);
    if (applied > 0) {
      allocations.push({
        invoiceId: invoice.invoiceId,
        allocatedAmount: Number(applied.toFixed(2)),
      });
      remaining -= applied;
    }
  }

  const totalAllocated = Number((safeAmount - remaining).toFixed(2));
  return {
    allocations,
    totalAllocated,
    remainingCredit: Number(Math.max(remaining, 0).toFixed(2)),
  };
}
