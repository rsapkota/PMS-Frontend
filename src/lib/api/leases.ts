import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface LeaseDto {
  id: string;
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  unitId: string;
  unitNumber: string;
  propertyId: number;
  propertyName: string;
  rentAmount: number;
  dueDay: number;
  leaseStart: string;
  leaseEnd: string;
  status: string;
  rentIncreasePercent: number;
  securityDeposit: number;
  createdAt: string;
}

export interface PaginatedLeases {
  items: LeaseDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetLeasesParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  Status?: string;
}

export interface UtilityConfig {
  label: string;
  type: string;
  rate: number;
  active: boolean;
}

export interface CreateLeaseRequest {
  unitId: string;
  propertyId: number;
  tenantId: number | null;
  newTenant: { fullName: string; email: string; phone: string } | null;
  rentAmount: number;
  dueDay: number;
  rentIncreasePercent: number;
  leaseStart: string;
  leaseEnd: string;
  securityDeposit: number;
  utilities: UtilityConfig[];
}

export interface RenewLeaseRequest {
  newEndDate: string;
}

export interface TerminateLeaseRequest {
  reason: string;
  effectiveDate: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getLeasesApi(params: GetLeasesParams): Promise<PaginatedLeases> {
  const { data, error } = await apiClient.GET("/api/leases", {
    params: { query: params },
  });
  if (error) throw error;
  return data as PaginatedLeases;
}

export async function createLeaseApi(body: CreateLeaseRequest): Promise<LeaseDto | null> {
  const { data, error } = await apiClient.POST("/api/leases", { body });
  if (error) throw error;
  return (data as LeaseDto | undefined) ?? null;
}

export async function renewLeaseApi(leaseId: string, body: RenewLeaseRequest): Promise<void> {
  const { error } = await apiClient.PUT("/api/leases/{leaseId}/renew", {
    params: { path: { leaseId } },
    body,
  });
  if (error) throw error;
}

export async function terminateLeaseApi(leaseId: string, body: TerminateLeaseRequest): Promise<void> {
  const { error } = await apiClient.PUT("/api/leases/{leaseId}/terminate", {
    params: { path: { leaseId } },
    body,
  });
  if (error) throw error;
}
