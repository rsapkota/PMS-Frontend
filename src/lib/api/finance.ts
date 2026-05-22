import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface TransactionDto {
  id: string;
  tenantName: string;
  tenantId: number;
  propertyName: string;
  unitNumber: string;
  amount: number;
  paidAmount?: number | null;
  outstandingAmount?: number | null;
  category: string;
  status: string;
  paymentMethod: string;
  paidOn: string;
  dueDate: string;
  note: string | null;
}

export interface FinanceSummaryDto {
  totalCollected: number;
  pendingPayments: number;
  overdueAmount: number;
  expectedRevenue: number;
}

export interface PaginatedTransactions {
  items: TransactionDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetTransactionsParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  Status?: string;
  Category?: string;
}

export interface CollectRentRequest {
  unitId: string;
  amount: number;
  paymentMethod: string;
  note: string | null;
  paidOn: string;
}

export interface UpdateInvoiceStatusRequest {
  status: string;
}

export interface PaymentAllocationInput {
  invoiceId: string;
  allocatedAmount: number;
}

export interface CreateFinancePaymentRequest {
  tenantId: number | string;
  amount: number;
  paymentMethod: string;
  paidOn: string;
  note: string | null;
  allocations: PaymentAllocationInput[];
}

export interface OpenInvoiceDto {
  invoiceId: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

export interface TenantOpenInvoicesDto {
  items: OpenInvoiceDto[];
  tenantCreditBalance: number;
}

export interface TenantFinanceAccountDto {
  tenantId: number | string;
  currentBalance: number;
  creditBalance: number;
  overdueAmount: number;
  pendingAmount: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface RecordPaymentResponseDto {
  paymentId: string;
  totalAllocated: number;
  createdCreditAmount: number;
  tenantCreditBalance: number;
  invoiceUpdates: Array<{
    invoiceId: string;
    paidAmount: number;
    outstandingAmount: number;
    status: string;
  }>;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getFinanceTransactionsApi(params: GetTransactionsParams): Promise<PaginatedTransactions> {
  const { data, error, response } = await apiClient.GET("/api/finance/transactions", {
    params: { query: params },
    parseAs: "json",
  });
  if (error || !response.ok) {
    throw new Error("Failed to load transactions");
  }
  return (data ?? {
    items: [],
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  }) as unknown as PaginatedTransactions;
}

export async function getFinanceSummaryApi(): Promise<FinanceSummaryDto> {
  const { data, error, response } = await apiClient.GET("/api/finance/summary", {
    parseAs: "json",
  });
  if (error || !response.ok || !data) {
    throw new Error("Failed to load finance summary");
  }
  return data as unknown as FinanceSummaryDto;
}

export async function collectRentApi(body: CollectRentRequest): Promise<void> {
  const { error } = await apiClient.POST("/api/finance/collect-rent", { body });
  if (error) throw error;
}

export async function generateInvoicesApi(): Promise<void> {
  const { error } = await apiClient.POST("/api/finance/generate-invoices", {});
  if (error) throw error;
}

export async function updateInvoiceStatusApi(transactionId: string, body: UpdateInvoiceStatusRequest): Promise<void> {
  const { error, response } = await apiClient.PATCH("/api/finance/transactions/{transactionId}/status", {
    params: { path: { transactionId } },
    body,
  });
  if (error || !response.ok) {
    throw new Error("Failed to update invoice status");
  }
}

export async function getTenantOpenInvoicesApi(tenantId: number | string): Promise<TenantOpenInvoicesDto> {
  const { data, error, response } = await apiClient.GET("/api/finance/tenants/{tenantId}/open-invoices", {
    params: { path: { tenantId } },
    parseAs: "json",
  });
  if (error || !response.ok) {
    throw new Error("Failed to load open invoices");
  }
  return (data ?? { items: [], tenantCreditBalance: 0 }) as unknown as TenantOpenInvoicesDto;
}

export async function getTenantFinanceAccountApi(tenantId: number | string): Promise<TenantFinanceAccountDto> {
  const { data, error, response } = await apiClient.GET("/api/finance/tenants/{tenantId}/account", {
    params: { path: { tenantId } },
    parseAs: "json",
  });
  if (error || !response.ok || !data) {
    throw new Error("Failed to load tenant account");
  }
  return data as unknown as TenantFinanceAccountDto;
}

export async function createFinancePaymentApi(body: CreateFinancePaymentRequest): Promise<RecordPaymentResponseDto> {
  const { data, error, response } = await apiClient.POST("/api/finance/payments", {
    body,
    parseAs: "json",
  });
  if (error || !response.ok || !data) {
    throw new Error("Failed to record payment");
  }
  return data as unknown as RecordPaymentResponseDto;
}
