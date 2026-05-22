import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface MaintenanceTaskDto {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  propertyId: number;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  technicianName: string;
  description: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSummaryDto {
  activeTasks: number;
  criticalIssues: number;
  avgResolutionDays: number;
  tasksCompleted: number;
}

export interface PaginatedMaintenance {
  items: MaintenanceTaskDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetMaintenanceParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  Status?: string;
  Priority?: string;
  Category?: string;
  SortBy?: string;
  SortDir?: string;
}

export interface CreateMaintenanceRequest {
  title: string;
  category: string;
  priority: string;
  propertyId: number;
  unitNumber: string;
  technicianName: string;
  description: string;
}

export interface UpdateMaintenanceRequest {
  title: string;
  unitNumber: string;
  priority: string;
  category: string;
  technicianName: string;
  notes: string | null;
}

export interface UpdateMaintenanceStatusRequest {
  status: string;
}

export interface ReassignTechnicianRequest {
  technicianName: string;
}

export interface BulkMaintenanceRequest {
  ids: string[];
  action: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getMaintenanceApi(params: GetMaintenanceParams): Promise<PaginatedMaintenance> {
  const { data, error } = await apiClient.GET("/api/maintenance", {
    params: { query: params },
  });
  if (error) throw error;
  return data as PaginatedMaintenance;
}

export async function getMaintenanceSummaryApi(): Promise<MaintenanceSummaryDto> {
  const { data, error } = await apiClient.GET("/api/maintenance/summary");
  if (error) throw error;
  return data as MaintenanceSummaryDto;
}

export async function createMaintenanceApi(body: CreateMaintenanceRequest): Promise<void> {
  const { error } = await apiClient.POST("/api/maintenance", { body });
  if (error) throw error;
}

export async function updateMaintenanceApi(taskId: string, body: UpdateMaintenanceRequest): Promise<void> {
  const { error } = await apiClient.PUT("/api/maintenance/{taskId}", {
    params: { path: { taskId } },
    body,
  });
  if (error) throw error;
}

export async function updateMaintenanceStatusApi(taskId: string, body: UpdateMaintenanceStatusRequest): Promise<void> {
  const { error } = await apiClient.PATCH("/api/maintenance/{taskId}/status", {
    params: { path: { taskId } },
    body,
  });
  if (error) throw error;
}

export async function reassignTechnicianApi(taskId: string, body: ReassignTechnicianRequest): Promise<void> {
  const { error } = await apiClient.PATCH("/api/maintenance/{taskId}/technician", {
    params: { path: { taskId } },
    body,
  });
  if (error) throw error;
}

export async function deleteMaintenanceApi(taskId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/api/maintenance/{taskId}", {
    params: { path: { taskId } },
  });
  if (error) throw error;
}

export async function bulkMaintenanceApi(body: BulkMaintenanceRequest): Promise<void> {
  const { error } = await apiClient.PATCH("/api/maintenance/bulk", { body });
  if (error) throw error;
}
