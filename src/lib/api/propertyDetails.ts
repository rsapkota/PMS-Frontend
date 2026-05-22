import { apiClient } from "./client";
import type { components } from "./schema.d.ts";

export type CreateUnitRequest = components["schemas"]["CreateUnitRequest"];

// ── Response DTOs (backend returns untyped content, defined here manually) ───

export interface PropertySummaryDto {
  id: number;
  name: string;
  address: string;
  type: string;
  status: string;
  image: string | null;
  totalUnits: number;
  occupiedUnits: number;
  activeTenants: number;
  totalMonthlyRent: number;
  collectedThisMonth: number;
}

export interface ActivityDto {
  id: string | number;
  title: string;
  description: string;
  amount: number | null;
  occurredAt: string;
  type: "Payment" | "Maintenance" | "Lease" | "Other";
}

export interface TransactionDto {
  id: string;
  tenantName: string;
  unitNumber: string;
  amount: number;
  date: string;
  category: string;
  status: "Paid" | "Pending";
  method: string;
}

export interface PaginatedTransactions {
  items: TransactionDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface UnitDto {
  id: string;
  number: string;
  type: string;
  rentAmount: number | null;
  status: "Occupied" | "Vacant" | "Maintenance";
  tenantName: string | null;
  floor: string;
  areaSqft: number | null;
}

export interface PaginatedUnits {
  items: UnitDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getPropertySummaryApi(propertyId: number): Promise<PropertySummaryDto> {
  const { data, response } = await apiClient.GET("/api/properties/{propertyId}/summary", {
    params: { path: { propertyId } },
    parseAs: "json",
  });
  if (!response.ok) throw new Error(response.status === 404 ? "NOT_FOUND" : "Failed to load property.");
  return data as unknown as PropertySummaryDto;
}

export async function getPropertyActivityApi(propertyId: number, limit = 5): Promise<ActivityDto[]> {
  const { data, response } = await apiClient.GET("/api/properties/{propertyId}/activity", {
    params: { path: { propertyId }, query: { limit } },
    parseAs: "json",
  });
  if (!response.ok) throw new Error("Failed to load activity.");
  return (data as unknown as ActivityDto[]) ?? [];
}

export async function getPropertyTransactionsApi(
  propertyId: number,
  params: { page?: number; pageSize?: number; search?: string } = {}
): Promise<PaginatedTransactions> {
  const { data, response } = await apiClient.GET("/api/properties/{propertyId}/transactions", {
    params: {
      path: { propertyId },
      query: { Page: params.page, PageSize: params.pageSize, Search: params.search },
    },
    parseAs: "json",
  });
  if (!response.ok) throw new Error("Failed to load transactions.");
  return (data as unknown as PaginatedTransactions) ?? { items: [], totalItems: 0, totalPages: 0, currentPage: 1 };
}

export async function getPropertyUnitsApi(
  propertyId: number,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedUnits> {
  const { data, response } = await apiClient.GET("/api/properties/{propertyId}/units", {
    params: {
      path: { propertyId },
      query: { Page: params.page, PageSize: params.pageSize },
    },
    parseAs: "json",
  });
  if (!response.ok) throw new Error("Failed to load units.");
  return (data as unknown as PaginatedUnits) ?? { items: [], totalItems: 0, totalPages: 0, currentPage: 1 };
}

export async function createUnitApi(propertyId: number, body: CreateUnitRequest): Promise<UnitDto> {
  const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5135";
  const token = localStorage.getItem("auth-token");

  const response = await fetch(`${BASE_URL}/api/properties/${propertyId}/units`, {
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

  return response.json() as Promise<UnitDto>;
}
