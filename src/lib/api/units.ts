import { apiClient } from "./client";
import type { components } from "./schema.d.ts";

export type CreateGlobalUnitRequest = components["schemas"]["CreateGlobalUnitRequest"];

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface UnitListItemDto {
  id: string;
  number: string;
  propertyId: number;
  propertyName: string;
  type: string;
  rentAmount: number | null;
  status: "Occupied" | "Vacant" | "Maintenance";
  tenantName: string | null;
  floor: string;
  areaSqft: number | null;
}

export interface UnitDetailDto extends UnitListItemDto {
  tenantId?: string | null;
  leaseStart?: string | null;
  leaseEnd?: string | null;
  securityDeposit?: number | null;
  features?: string[];
}

export interface UnitSummaryDto {
  totalUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupiedUnits: number;
  totalPotentialRent: number;
}

export interface PaginatedGlobalUnits {
  items: UnitListItemDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetUnitsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  propertyId?: number;
  unitType?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getUnitsApi(params: GetUnitsParams = {}): Promise<PaginatedGlobalUnits> {
  const { data, response } = await apiClient.GET("/api/units", {
    params: {
      query: {
        Page: params.page,
        PageSize: params.pageSize,
        Search: params.search,
        Status: params.status,
        PropertyId: params.propertyId,
        UnitType: params.unitType,
        SortBy: params.sortBy,
        SortDir: params.sortDir,
      },
    },
    parseAs: "json",
  });

  if (!response.ok) throw new Error("Failed to load units.");
  return (data as unknown as PaginatedGlobalUnits) ?? {
    items: [],
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
  };
}

export async function getUnitsSummaryApi(): Promise<UnitSummaryDto> {
  const { data, response } = await apiClient.GET("/api/units/summary", {
    parseAs: "json",
  });

  if (!response.ok) throw new Error("Failed to load units summary.");
  return data as unknown as UnitSummaryDto;
}

export async function getUnitApi(unitId: string): Promise<UnitDetailDto> {
  const { data, response } = await apiClient.GET("/api/units/{unitId}", {
    params: { path: { unitId } },
    parseAs: "json",
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "Failed to load unit.");
  }
  return data as unknown as UnitDetailDto;
}

export async function createGlobalUnitApi(body: CreateGlobalUnitRequest): Promise<UnitListItemDto> {
  const BASE_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5135");
  const token = localStorage.getItem("auth-token");

  const response = await fetch(`${BASE_URL}/api/units`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let msg = "Failed to create unit.";
    try {
      const errObj = await response.json() as { message?: string; errors?: Record<string, string[]> };
      if (errObj.message) {
        msg = errObj.message;
      } else if (errObj.errors) {
        const firstKey = Object.keys(errObj.errors)[0];
        msg = errObj.errors[firstKey]?.[0] ?? msg;
      }
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(msg);
  }

  return response.json() as Promise<UnitListItemDto>;
}
