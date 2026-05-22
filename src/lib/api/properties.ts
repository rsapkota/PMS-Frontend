import { apiClient } from "./client";
import type { components } from "./schema.d.ts";

export type CreatePropertyRequest = components["schemas"]["CreatePropertyRequest"];
export type UpdatePropertyRequest = components["schemas"]["UpdatePropertyRequest"];

export interface PropertyDto {
  id: number;
  name: string;
  address: string;
  type: string;
  units: number;
  occupied: number;
  status: string;
  income: number;
  valuation: string | null;
  image: string | null;
}

export interface PaginatedProperties {
  items: PropertyDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetPropertiesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export async function getPropertiesApi(params: GetPropertiesParams = {}): Promise<PaginatedProperties> {
  const { data, error, response } = await apiClient.GET("/api/properties", {
    params: {
      query: {
        Page: params.page,
        PageSize: params.pageSize,
        Search: params.search,
        Status: params.status,
      },
    },
    parseAs: "json",
  });

  if (error || !response.ok) {
    throw new Error("Failed to load properties.");
  }

  return data as unknown as PaginatedProperties;
}

export async function getPropertyApi(id: number): Promise<PropertyDto> {
  const { data, error, response } = await apiClient.GET("/api/properties/{id}", {
    params: { path: { id } },
    parseAs: "json",
  });

  if (error || !response.ok) {
    throw new Error("Property not found.");
  }

  return data as unknown as PropertyDto;
}

export async function createPropertyApi(body: CreatePropertyRequest): Promise<PropertyDto> {
  const { data, error, response } = await apiClient.POST("/api/properties", {
    body,
    parseAs: "json",
  });

  if (error || !response.ok) {
    const msg = (error as { message?: string } | undefined)?.message ?? "Failed to create property.";
    throw new Error(msg);
  }

  return data as unknown as PropertyDto;
}

export async function updatePropertyApi(id: number, body: UpdatePropertyRequest): Promise<PropertyDto> {
  const { data, error, response } = await apiClient.PUT("/api/properties/{id}", {
    params: { path: { id } },
    body,
    parseAs: "json",
  });

  if (error || !response.ok) {
    throw new Error("Failed to update property.");
  }

  return data as unknown as PropertyDto;
}

export async function deletePropertyApi(id: number): Promise<void> {
  const { error, response } = await apiClient.DELETE("/api/properties/{id}", {
    params: { path: { id } },
  });

  if (error || !response.ok) {
    throw new Error("Failed to delete property.");
  }
}
