import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, Wallet, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Filter, 
  FileText, Download,
  Building2, Calendar, CreditCard,
  AlertCircle, Clock, ChevronLeft, ChevronRight,
  HandCoins
} from "lucide-react";
import {
  getFinanceTransactionsApi,
  getFinanceSummaryApi,
  generateInvoicesApi,
  getTenantOpenInvoicesApi,
  getTenantFinanceAccountApi,
  createFinancePaymentApi,
} from "@/lib/api/finance";
import type { TransactionDto, FinanceSummaryDto, OpenInvoiceDto, TenantFinanceAccountDto } from "@/lib/api/finance";
import { getTenantsApi } from "@/lib/api/tenants";
import type { TenantSearchResult } from "@/lib/api/tenants";
import { formatNPR } from "@/lib/currency";

export default function Finance() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  usePageTitle("Finance");

  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryDto | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [paymentTenantId, setPaymentTenantId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState("");
  const [prefillTenantName, setPrefillTenantName] = useState("");
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [hasManualAllocationEdits, setHasManualAllocationEdits] = useState(false);
  const [prefillInvoiceRef, setPrefillInvoiceRef] = useState<{ invoiceRef: string; amount: number } | null>(null);
  const [paymentTenants, setPaymentTenants] = useState<TenantSearchResult[]>([]);
  const [isLoadingPaymentTenants, setIsLoadingPaymentTenants] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceDto[]>([]);
  const [tenantCreditBalance, setTenantCreditBalance] = useState(0);
  const [tenantAccount, setTenantAccount] = useState<TenantFinanceAccountDto | null>(null);
  const [isLoadingOpenInvoices, setIsLoadingOpenInvoices] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTransactions = useCallback(async (page: number, size: number, search: string, status: string) => {
    try {
      const result = await getFinanceTransactionsApi({
        Page: page, PageSize: size,
        Search: search || undefined,
        Status: status !== "all" ? status : undefined,
      });
      setTransactions(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
    } catch {
      toast.error("Failed to load transactions");
    }
  }, []);

  useEffect(() => {
    loadTransactions(currentPage, pageSize, searchTerm, filterStatus);
  }, [loadTransactions, currentPage, pageSize, searchTerm, filterStatus]);

  useEffect(() => {
    getFinanceSummaryApi().then(setSummary).catch(() => {});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchTerm(value); setCurrentPage(1); }, 400);
  };

  const handlePageSizeChange = (v: string) => { setPageSize(Number(v)); setCurrentPage(1); };

  const handleExport = () => {
    const headers = "ID,Tenant,Unit,Property,Amount,Date,Category,Status,Method";
    const rows = transactions.map(t => `${t.id},${t.tenantName},${t.unitNumber},${t.propertyName},${t.amount},${t.paidOn},${t.category},${t.status},${t.paymentMethod}`).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "finance-report.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Report exported!", { description: `${transactions.length} transactions downloaded as CSV.` });
  };

  const handleGenerateInvoices = async () => {
    try {
      await generateInvoicesApi();
      toast.success("Invoices generated!", { description: "Invoices have been sent to tenants." });
      loadTransactions(1, pageSize, searchTerm, filterStatus);
      setCurrentPage(1);
    } catch {
      toast.error("Failed to generate invoices");
    }
  };

  const normalizeTenantId = useCallback((value: unknown): string => String(value ?? "").trim().toLowerCase(), []);

  const tenantOptions = useMemo(() => {
    const options = paymentTenants
      .map((t) => {
        const raw = t as unknown as Record<string, unknown>;
        const tenantIdRaw = raw.id ?? raw.Id ?? t.id;
        const tenantId = normalizeTenantId(tenantIdRaw);
        const fullName = String(raw.name ?? raw.Name ?? raw.fullName ?? raw.FullName ?? t.fullName ?? "").trim();
        const email = String(raw.email ?? raw.Email ?? t.email ?? "").trim();
        const tenantName = fullName || email || (tenantId ? `Tenant #${tenantId}` : "Unknown Tenant");

        if (!tenantId) return null;
        return { tenantId, tenantName };
      })
      .filter((x): x is { tenantId: string; tenantName: string } => x !== null);

    const dedup = new Map<string, string>();
    for (const option of options) {
      if (!dedup.has(option.tenantId)) dedup.set(option.tenantId, option.tenantName);
    }

    return Array.from(dedup.entries())
      .map(([tenantId, tenantName]) => ({ tenantId, tenantName }))
      .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [paymentTenants, normalizeTenantId]);

  const selectedTenantOption = useMemo(
    () => tenantOptions.find((t) => normalizeTenantId(t.tenantId) === normalizeTenantId(paymentTenantId)) ?? null,
    [tenantOptions, paymentTenantId, normalizeTenantId]
  );

  const loadPaymentTenants = useCallback(async () => {
    setIsLoadingPaymentTenants(true);
    try {
      const res = await getTenantsApi({
        Page: 1,
        PageSize: 100,
      });
      const result: TenantSearchResult[] = res.items.map((t) => {
        const raw = t as unknown as Record<string, unknown>;
        const name = String(raw.name ?? raw.Name ?? t.fullName ?? "").trim();
        return {
          id: t.id,
          fullName: name,
          email: t.email,
          phone: t.phone,
        };
      });
      if (result.length > 0) {
        setPaymentTenants(result);
      } else {
        const fallback = Array.from(new Map(transactions.map((t) => [t.tenantId, t.tenantName])).entries()).map(
          ([id, fullName]) => ({ id, fullName, email: "", phone: "" })
        );
        setPaymentTenants(fallback);
      }
    } catch {
      const fallback = Array.from(new Map(transactions.map((t) => [t.tenantId, t.tenantName])).entries()).map(
        ([id, fullName]) => ({ id, fullName, email: "", phone: "" })
      );
      setPaymentTenants(fallback);
      toast.error("Failed to load tenants for payment");
    } finally {
      setIsLoadingPaymentTenants(false);
    }
  }, [transactions]);

  useEffect(() => {
    if (!isPaymentDialogOpen) return;
    if (paymentTenants.length > 0) return;
    loadPaymentTenants();
  }, [isPaymentDialogOpen, paymentTenants.length, loadPaymentTenants]);

  useEffect(() => {
    if (paymentTenantId) return;
    if (!prefillTenantName) return;
    if (tenantOptions.length === 0) return;

    const byName = tenantOptions.find(
      (t) => t.tenantName.trim().toLowerCase() === prefillTenantName.trim().toLowerCase()
    );

    if (byName) {
      setPaymentTenantId(normalizeTenantId(byName.tenantId));
      setPrefillTenantName("");
    }
  }, [paymentTenantId, prefillTenantName, tenantOptions, normalizeTenantId]);

  const selectedTenantOpenInvoices = useMemo(() => {
    return [...openInvoices]
      .map((invoice) => ({
        invoice,
        outstanding: Number(invoice.outstandingAmount ?? 0),
      }))
      .filter((x) => x.outstanding > 0)
      .sort((a, b) => {
        const ad = Date.parse(a.invoice.dueDate);
        const bd = Date.parse(b.invoice.dueDate);
        if (!Number.isNaN(ad) && !Number.isNaN(bd) && ad !== bd) return ad - bd;
        return a.invoice.invoiceId.localeCompare(b.invoice.invoiceId);
      });
  }, [openInvoices]);

  const resolveSubmitInvoiceId = useCallback((invoice: OpenInvoiceDto): string => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const raw = invoice as unknown as Record<string, unknown>;
    const candidate =
      raw.id ??
      raw.Id ??
      raw.invoiceGuid ??
      raw.InvoiceGuid ??
      raw.transactionId ??
      raw.TransactionId ??
      raw.invoiceId ??
      raw.InvoiceId;

    const direct = String(candidate ?? "").trim();
    if (direct && uuidPattern.test(direct)) return direct;

    // Look for any additional id-like fields that may carry canonical GUIDs.
    for (const [key, value] of Object.entries(raw)) {
      if (!/id/i.test(key)) continue;
      const v = String(value ?? "").trim();
      if (uuidPattern.test(v)) return v;
    }

    // Avoid sending display invoice numbers like TXN-5001 as canonical IDs.
    if (/^TXN-/i.test(direct)) return "";
    return direct;
  }, []);

  const resolveDisplayInvoiceId = useCallback((invoice: OpenInvoiceDto): string => {
    const raw = invoice as unknown as Record<string, unknown>;
    const candidate = raw.invoiceNumber ?? raw.InvoiceNumber ?? raw.invoiceId ?? raw.InvoiceId ?? raw.id ?? raw.Id;
    const value = String(candidate ?? "").trim();
    return value || "N/A";
  }, []);

  const openRecordPaymentFromRow = useCallback((tx: TransactionDto) => {
    const outstanding = Number(tx.outstandingAmount ?? Math.max(tx.amount - Number(tx.paidAmount ?? 0), 0));
    const seedAmount = Number.isFinite(outstanding) && outstanding > 0 ? outstanding : Number(tx.amount ?? 0);
    const tenantId = normalizeTenantId(tx.tenantId);

    // Ensure selected tenant exists in Select options immediately,
    // even before async tenant list fetch completes.
    setPaymentTenants((prev) => {
      const exists = prev.some((t) => normalizeTenantId((t as unknown as Record<string, unknown>).id ?? t.id) === tenantId);
      if (exists) return prev;
      return [
        {
          id: tenantId,
          fullName: tx.tenantName,
          email: "",
          phone: "",
        },
        ...prev,
      ];
    });

    setPaymentTenantId(tenantId);
  setPrefillTenantName(tx.tenantName || "");
    setPaymentAmount(seedAmount > 0 ? Number(seedAmount.toFixed(2)).toString() : "");
    setPaymentMethod(tx.paymentMethod || "Bank Transfer");
    setPaymentNote(`Payment for invoice ${tx.id}`);
    setHasManualAllocationEdits(false);
    setPrefillInvoiceRef({ invoiceRef: String(tx.id), amount: seedAmount });
    setIsPaymentDialogOpen(true);

    toast.message("Payment form prefilled", {
      description: `${tx.tenantName} • Invoice ${tx.id}`,
    });
  }, [normalizeTenantId]);

  const loadTenantPaymentContext = useCallback(async (tenantId: number | string) => {
    setIsLoadingOpenInvoices(true);
    try {
      const [invoiceRes, accountRes] = await Promise.all([
        getTenantOpenInvoicesApi(tenantId),
        getTenantFinanceAccountApi(tenantId),
      ]);
      setOpenInvoices(invoiceRes.items ?? []);
      setTenantCreditBalance(Number(invoiceRes.tenantCreditBalance ?? 0));
      setTenantAccount(accountRes);
    } catch {
      setOpenInvoices([]);
      setTenantCreditBalance(0);
      setTenantAccount(null);
      toast.error("Failed to load tenant invoice details");
    } finally {
      setIsLoadingOpenInvoices(false);
    }
  }, []);

  useEffect(() => {
    const selectedId = normalizeTenantId(paymentTenantId);
    if (!selectedId) {
      setOpenInvoices([]);
      setTenantCreditBalance(0);
      setTenantAccount(null);
      return;
    }
    loadTenantPaymentContext(selectedId);
  }, [paymentTenantId, loadTenantPaymentContext, normalizeTenantId]);

  useEffect(() => {
    setManualAllocations((prev) => {
      const next: Record<string, string> = {};
      for (const { invoice } of selectedTenantOpenInvoices) {
        next[invoice.invoiceId] = prev[invoice.invoiceId] ?? "";
      }
      return next;
    });
  }, [selectedTenantOpenInvoices]);

  useEffect(() => {
    if (hasManualAllocationEdits) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setManualAllocations((prev) => {
        const next: Record<string, string> = {};
        for (const { invoice } of selectedTenantOpenInvoices) {
          next[invoice.invoiceId] = prev[invoice.invoiceId] ?? "";
        }
        return next;
      });
      return;
    }

    let remaining = amount;
    const auto: Record<string, string> = {};
    for (const { invoice, outstanding } of selectedTenantOpenInvoices) {
      if (remaining <= 0) {
        auto[invoice.invoiceId] = "";
        continue;
      }
      const applied = Math.min(outstanding, remaining);
      auto[invoice.invoiceId] = applied > 0 ? Number(applied.toFixed(2)).toString() : "";
      remaining -= applied;
    }
    setManualAllocations(auto);
  }, [paymentAmount, selectedTenantOpenInvoices, hasManualAllocationEdits]);

  useEffect(() => {
    if (!prefillInvoiceRef) return;
    if (selectedTenantOpenInvoices.length === 0) return;

    const target = selectedTenantOpenInvoices.find(({ invoice }) => {
      const display = resolveDisplayInvoiceId(invoice);
      const submit = resolveSubmitInvoiceId(invoice);
      return (
        invoice.invoiceId === prefillInvoiceRef.invoiceRef ||
        display === prefillInvoiceRef.invoiceRef ||
        submit === prefillInvoiceRef.invoiceRef
      );
    });

    if (!target) return;

    const applyAmount = Math.min(target.outstanding, prefillInvoiceRef.amount > 0 ? prefillInvoiceRef.amount : target.outstanding);
    const next: Record<string, string> = {};
    for (const { invoice } of selectedTenantOpenInvoices) {
      next[invoice.invoiceId] = invoice.invoiceId === target.invoice.invoiceId ? Number(applyAmount.toFixed(2)).toString() : "";
    }

    setManualAllocations(next);
    setHasManualAllocationEdits(true);
    setPrefillInvoiceRef(null);
  }, [prefillInvoiceRef, selectedTenantOpenInvoices, resolveDisplayInvoiceId, resolveSubmitInvoiceId]);

  const paymentAllocation = useMemo(() => {
    const amount = Number(paymentAmount);
    const lines = selectedTenantOpenInvoices.map(({ invoice, outstanding }) => {
      const raw = Number(manualAllocations[invoice.invoiceId] || 0);
      const safe = Number.isFinite(raw) && raw > 0 ? raw : 0;
      const capped = Number(Math.min(safe, outstanding).toFixed(2));
      const overOutstanding = safe > outstanding;
      return {
        invoiceId: invoice.invoiceId,
        requestedAmount: safe,
        allocatedAmount: capped,
        overOutstanding,
      };
    });

    const totalAllocated = Number(lines.reduce((sum, x) => sum + x.allocatedAmount, 0).toFixed(2));
    const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
    const overAllocatedAmount = Number(Math.max(totalAllocated - validAmount, 0).toFixed(2));

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        allocations: lines,
        totalAllocated,
        remainingCredit: 0,
        overAllocatedAmount,
        hasOverOutstanding: lines.some((x) => x.overOutstanding),
      };
    }

    return {
      allocations: lines,
      totalAllocated,
      remainingCredit: Number(Math.max(validAmount - totalAllocated, 0).toFixed(2)),
      overAllocatedAmount,
      hasOverOutstanding: lines.some((x) => x.overOutstanding),
    };
  }, [paymentAmount, selectedTenantOpenInvoices, manualAllocations]);

  const resetPaymentForm = () => {
    setPaymentTenantId("");
    setPaymentAmount("");
    setPaymentMethod("Bank Transfer");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
    setPrefillTenantName("");
    setManualAllocations({});
    setHasManualAllocationEdits(false);
    setPrefillInvoiceRef(null);
    setOpenInvoices([]);
    setTenantCreditBalance(0);
    setTenantAccount(null);
  };

  const handleRecordPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentTenantId) {
      toast.error("Select a tenant to record payment");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (paymentAllocation.overAllocatedAmount > 0) {
      toast.error("Allocated amount exceeds payment amount");
      return;
    }

    setIsSavingPayment(true);
    const selectedTenant = paymentTenantId;

    try {
      const allocations = paymentAllocation.allocations
        .filter((line) => line.allocatedAmount > 0)
        .map((line) => {
          const match = selectedTenantOpenInvoices.find(({ invoice }) => invoice.invoiceId === line.invoiceId)?.invoice;
          const submitInvoiceId = match ? resolveSubmitInvoiceId(match) : line.invoiceId;
          return {
            invoiceId: submitInvoiceId,
            allocatedAmount: line.allocatedAmount,
          };
        })
        .filter((line) => line.invoiceId.length > 0);

      if (allocations.length === 0 && paymentAllocation.allocations.some((line) => line.allocatedAmount > 0)) {
        toast.error("Could not resolve canonical invoice id", {
          description: "Open invoices response must include GUID id (e.g. id/invoiceGuid/transactionId), not only TXN code.",
        });
        return;
      }

      const result = await createFinancePaymentApi({
        tenantId: selectedTenant,
        amount,
        paymentMethod,
        paidOn: paymentDate,
        note: paymentNote || null,
        allocations,
      });

      await Promise.all([
        loadTransactions(currentPage, pageSize, searchTerm, filterStatus),
        getFinanceSummaryApi().then(setSummary).catch(() => null),
        loadTenantPaymentContext(selectedTenant),
      ]);

      const selectedTenantLabel = tenantOptions.find((t) => t.tenantId === selectedTenant)?.tenantName ?? "tenant";
      toast.success("Payment recorded", {
        description:
          Number(result.createdCreditAmount) > 0
            ? `${formatNPR(amount)} captured for ${selectedTenantLabel}. Credit balance created: ${formatNPR(Number(result.createdCreditAmount))}.`
            : `${formatNPR(amount)} applied to selected invoices for ${selectedTenantLabel}.`,
      });

      setIsPaymentDialogOpen(false);
      resetPaymentForm();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + transactions.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
      case "Pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "Overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 animate-pulse">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor revenue collection, transaction history, and cash flow.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2" onClick={() => { resetPaymentForm(); setIsPaymentDialogOpen(true); }}>
            <HandCoins className="h-4 w-4" />
            Record Payment
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={handleGenerateInvoices}>
            <FileText className="h-4 w-4" />
            Generate Invoices
          </Button>
        </div>
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if (!open) resetPaymentForm(); }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Record Tenant Payment</DialogTitle>
            <DialogDescription>
              Allocate payment manually by invoice. Any unallocated amount is tracked as credit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tenant</Label>
              <Select value={paymentTenantId} onValueChange={(v) => { if (v != null) { setPaymentTenantId(normalizeTenantId(v)); setHasManualAllocationEdits(false); } }}>
                <SelectTrigger>
                  {selectedTenantOption ? (
                    <span className="truncate">{selectedTenantOption.tenantName}</span>
                  ) : (
                    <SelectValue placeholder="Select tenant" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {isLoadingPaymentTenants && <SelectItem value="__loading" disabled>Loading tenants...</SelectItem>}
                  {!isLoadingPaymentTenants && tenantOptions.length === 0 && (
                    <SelectItem value="__empty" disabled>No tenants found</SelectItem>
                  )}
                  {tenantOptions.map((t) => (
                    <SelectItem key={t.tenantId} value={String(t.tenantId)}>{t.tenantName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => { if (v != null) setPaymentMethod(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Reference number or note" />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/10">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="text-sm font-semibold">Allocation Preview</p>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">Applied: {formatNPR(paymentAllocation.totalAllocated)}</Badge>
                <Badge variant={paymentAllocation.remainingCredit > 0 ? "secondary" : "outline"}>
                  Credit: {formatNPR(paymentAllocation.remainingCredit)}
                </Badge>
              </div>
            </div>

            {tenantAccount && (
              <div className="grid gap-2 border-b px-4 py-2 text-xs md:grid-cols-3">
                <p className="text-muted-foreground">Current Balance: <span className="font-semibold text-foreground">{formatNPR(Number(tenantAccount.currentBalance ?? 0))}</span></p>
                <p className="text-muted-foreground">Pending: <span className="font-semibold text-foreground">{formatNPR(Number(tenantAccount.pendingAmount ?? 0))}</span></p>
                <p className="text-muted-foreground">Existing Credit: <span className="font-semibold text-foreground">{formatNPR(Number(tenantCreditBalance))}</span></p>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto px-4 py-2">
              {isLoadingOpenInvoices ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading open invoices...</p>
              ) : selectedTenantOpenInvoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No open invoices for this tenant.</p>
              ) : (
                <div className="space-y-2">
                  {selectedTenantOpenInvoices.map(({ invoice, outstanding }) => {
                    const line = paymentAllocation.allocations.find((a) => a.invoiceId === invoice.invoiceId);
                    const applied = line?.allocatedAmount ?? 0;
                    const displayInvoiceId = resolveDisplayInvoiceId(invoice);
                    return (
                      <div key={invoice.invoiceId} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">Invoice {displayInvoiceId}</p>
                          <p className="text-xs text-muted-foreground">Due {invoice.dueDate || "N/A"} • Outstanding {formatNPR(outstanding)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            max={outstanding}
                            className="h-8 w-32"
                            placeholder="0.00"
                            value={manualAllocations[invoice.invoiceId] ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setHasManualAllocationEdits(true);
                              setManualAllocations((prev) => ({ ...prev, [invoice.invoiceId]: value }));
                            }}
                          />
                          <Badge variant={applied > 0 ? "default" : "outline"}>{applied > 0 ? `Apply ${formatNPR(applied)}` : "No allocation"}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {(paymentAllocation.overAllocatedAmount > 0 || paymentAllocation.hasOverOutstanding) && (
              <div className="border-t px-4 py-2">
                {paymentAllocation.overAllocatedAmount > 0 && (
                  <p className="text-xs text-destructive">Allocation exceeds payment amount by {formatNPR(paymentAllocation.overAllocatedAmount)}.</p>
                )}
                {paymentAllocation.hasOverOutstanding && (
                  <p className="text-xs text-destructive">One or more lines exceed invoice outstanding amount and were capped in preview.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPaymentDialogOpen(false); resetPaymentForm(); }} disabled={isSavingPayment}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isSavingPayment || paymentAllocation.overAllocatedAmount > 0 || isLoadingOpenInvoices}>{isSavingPayment ? "Saving..." : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <FinanceStatCard 
          label="Total Collected" 
          value={summary ? formatNPR(summary.totalCollected) : "—"} 
          change="+12.5%" 
          trend="up"
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} 
        />
        <FinanceStatCard 
          label="Pending Payments" 
          value={summary ? formatNPR(summary.pendingPayments) : "—"} 
          change="-4.2%" 
          trend="down"
          icon={<Clock className="h-4 w-4 text-amber-500" />} 
        />
        <FinanceStatCard 
          label="Overdue Amount" 
          value={summary ? formatNPR(summary.overdueAmount) : "—"} 
          change="+2.1%" 
          trend="up"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />} 
        />
        <FinanceStatCard 
          label="Exp. Revenue" 
          value={summary ? formatNPR(summary.expectedRevenue) : "—"} 
          change="Target" 
          trend="neutral"
          icon={<Wallet className="h-4 w-4 text-primary" />} 
        />
      </div>

      {/* Main Ledger Card */}
      <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by ID, tenant, or property..." 
                className="pl-9 bg-background border-muted" 
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={(v) => { if (v != null) { setFilterStatus(v); setCurrentPage(1); } }}>  
                <SelectTrigger className="h-9 w-[140px] gap-1.5">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-6 w-px bg-muted mx-1" />
              <p className="text-xs font-medium text-muted-foreground">
                {totalItems} total transactions
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="pl-6 py-4">Tenant</TableHead>
                <TableHead>Tenant & Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date & Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{tx.tenantName}</p>
                      <p className="font-mono text-[10px] font-bold text-muted-foreground tracking-tighter">TX-{String(tx.id).slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">
                        {tx.tenantName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{tx.tenantName}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5" /> {tx.propertyName} • Unit {tx.unitNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] uppercase font-bold px-2 py-0.5 bg-muted/50 border-none">
                      {tx.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {tx.paidOn || tx.dueDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        {tx.paymentMethod}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-black text-sm text-foreground">{formatNPR(tx.amount)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">NPR</p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(tx.status)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title={`Record payment for ${tx.tenantName} (Invoice ${tx.id})`}
                        aria-label={`Record payment for ${tx.tenantName} invoice ${tx.id}`}
                        onClick={() => openRecordPaymentFromRow(tx)}
                      >
                        <HandCoins className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="p-4 bg-muted/10 border-t flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{startIndex + 1}</span> to <span className="text-foreground">{endIndex}</span> of <span className="text-foreground">{totalItems}</span> transactions
            </p>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { if (v != null) handlePageSizeChange(v); }}>
                <SelectTrigger className="h-8 w-[70px] bg-background text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-[10px]">5</SelectItem>
                  <SelectItem value="10" className="text-[10px]">10</SelectItem>
                  <SelectItem value="25" className="text-[10px]">25</SelectItem>
                  <SelectItem value="50" className="text-[10px]">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-3 h-8 rounded-lg bg-background border text-xs font-bold">
              {currentPage} / {totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FinanceStatCard({ label, value, change, trend, icon }: { label: string, value: string, change: string, trend: "up" | "down" | "neutral", icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black tracking-tight">{value}</p>
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
              trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-primary"
            }`}>
              {trend === "up" ? <ArrowUpRight className="h-2.5 w-2.5" /> : trend === "down" ? <ArrowDownRight className="h-2.5 w-2.5" /> : null}
              {change}
            </span>
          </div>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
