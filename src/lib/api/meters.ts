import { apiClient } from "./client";

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface MeterDto {
  id: string;
  unitId: string;
  type: "Electricity" | "Water";
  meterNumber?: string | null;
  label: string;
  lastReading: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMeters {
  items: MeterDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface CreateMeterRequest {
  type: "Electricity" | "Water";
  meterNumber?: string | null;
  label: string;
  lastReading: number;
}

export interface UpdateMeterRequest {
  type?: "Electricity" | "Water";
  meterNumber?: string | null;
  label?: string;
  lastReading?: number;
  isActive?: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getMetersApi(unitId: string): Promise<PaginatedMeters> {
  const { data, response } = await apiClient.GET("/api/units/{unitId}/meters", {
    params: { path: { unitId } },
    parseAs: "json",
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "Unit not found" : "Failed to load meters.");
  }
  
  return (data as unknown as PaginatedMeters) ?? {
    items: [],
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
  };
}

export async function createMeterApi(unitId: string, body: CreateMeterRequest): Promise<MeterDto> {
  const { data, response } = await apiClient.POST("/api/units/{unitId}/meters", {
    params: { path: { unitId } },
    body,
    parseAs: "json",
  });

  if (!response.ok) {
    let msg = "Failed to create meter.";
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

  return data as unknown as MeterDto;
}

export async function updateMeterApi(unitId: string, meterId: string, body: UpdateMeterRequest): Promise<MeterDto> {
  const { data, response } = await apiClient.PUT("/api/units/{unitId}/meters/{meterId}", {
    params: { path: { unitId, meterId } },
    body,
    parseAs: "json",
  });

  if (!response.ok) {
    let msg = "Failed to update meter.";
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

  return data as unknown as MeterDto;
}

export async function deleteMeterApi(unitId: string, meterId: string): Promise<void> {
  const { response } = await apiClient.DELETE("/api/units/{unitId}/meters/{meterId}", {
    params: { path: { unitId, meterId } },
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "Meter not found" : "Failed to delete meter.");
  }
}
