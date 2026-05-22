import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface TenantDto {
  id: number | string;
  fullName: string;
  email: string;
  phone: string;
  unitNumber: string;
  propertyName: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export interface TenantSearchResult {
  id: number | string;
  fullName: string;
  email: string;
  phone: string;
}

export interface PaginatedTenants {
  items: TenantDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetTenantsParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  PaymentStatus?: string;
}

export interface CreateTenantRequest {
  fullName: string;
  email: string;
  phone: string;
}

function normalizeTenant(raw: unknown): TenantDto {
  const item = (raw ?? {}) as Record<string, unknown>;
  const fullName = String(item.fullName ?? item.FullName ?? item.name ?? item.Name ?? "").trim();

  return {
    id: (item.id ?? item.Id ?? "") as number | string,
    fullName,
    email: String(item.email ?? item.Email ?? ""),
    phone: String(item.phone ?? item.Phone ?? ""),
    unitNumber: String(item.unitNumber ?? item.UnitNumber ?? ""),
    propertyName: String(item.propertyName ?? item.PropertyName ?? ""),
    leaseStart: String(item.leaseStart ?? item.LeaseStart ?? ""),
    leaseEnd: String(item.leaseEnd ?? item.LeaseEnd ?? ""),
    rentAmount: Number(item.rentAmount ?? item.RentAmount ?? 0),
    paymentStatus: String(item.paymentStatus ?? item.PaymentStatus ?? ""),
    status: String(item.status ?? item.Status ?? ""),
    createdAt: String(item.createdAt ?? item.CreatedAt ?? item.joinedDate ?? item.JoinedDate ?? ""),
  };
}

function normalizeTenantSearch(raw: unknown): TenantSearchResult {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    id: (item.id ?? item.Id ?? "") as number | string,
    fullName: String(item.fullName ?? item.FullName ?? item.name ?? item.Name ?? "").trim(),
    email: String(item.email ?? item.Email ?? ""),
    phone: String(item.phone ?? item.Phone ?? ""),
  };
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getTenantsApi(params: GetTenantsParams): Promise<PaginatedTenants> {
  const { data, error, response } = await apiClient.GET("/api/tenants", {
    params: { query: params },
    parseAs: "json",
  });
  if (error || !response.ok) {
    throw new Error("Failed to load tenants.");
  }
  const payload = (data ?? {
    items: [],
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
  }) as unknown as Record<string, unknown>;

  const items = Array.isArray(payload.items) ? payload.items.map(normalizeTenant) : [];
  return {
    items,
    totalItems: Number(payload.totalItems ?? 0),
    totalPages: Number(payload.totalPages ?? 1),
    currentPage: Number(payload.currentPage ?? 1),
  };
}

export async function searchTenantsApi(q: string): Promise<TenantSearchResult[]> {
  const { data, error, response } = await apiClient.GET("/api/tenants/search", {
    params: { query: { q } },
    parseAs: "json",
  });
  if (error || !response.ok) {
    throw new Error("Failed to search tenants.");
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map(normalizeTenantSearch);
}

export async function getTenantApi(tenantId: string): Promise<TenantDto> {
  const { data, error, response } = await apiClient.GET("/api/tenants/{tenantId}", {
    params: { path: { tenantId } },
    parseAs: "json",
  });
  if (error || !response.ok || !data) {
    throw new Error("Tenant not found.");
  }
  return normalizeTenant(data);
}

export async function createTenantApi(body: CreateTenantRequest): Promise<void> {
  const { error, response } = await apiClient.POST("/api/tenants", { body });
  if (error || !response.ok) {
    throw new Error("Failed to save tenant.");
  }
}

export async function deleteTenantApi(tenantId: string): Promise<void> {
  const { error, response } = await apiClient.DELETE("/api/tenants/{tenantId}", {
    params: { path: { tenantId } },
  });
  if (error || !response.ok) {
    throw new Error("Failed to remove tenant.");
  }
}
