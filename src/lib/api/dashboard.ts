import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface AdminDashboardSummary {
  totalRevenue: number;
  activeProperties: number;
  occupancyRate: number;
  pendingRequests: number;
  totalUnits: number;
  vacantUnits: number;
  overduePayments: number;
  newTenantsThisMonth: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  relativeTime: string;
}

export interface ExpiringLease {
  leaseId: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  leaseEnd: string;
  daysLeft: number;
  rentAmount: number;
}

export interface TenantDashboard {
  monthlyRent: number;
  leaseEnd: string;
  openRequests: number;
  balanceDue: number;
  paymentHistory: { month: string; amount: number; status: string }[];
  openMaintenanceRequests: { id: string; title: string; status: string; priority: string }[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getDashboardSummaryApi(): Promise<AdminDashboardSummary> {
  const { data, error } = await apiClient.GET("/api/dashboard/summary");
  if (error) throw error;
  return data as AdminDashboardSummary;
}

export async function getDashboardActivityApi(limit?: number): Promise<DashboardActivity[]> {
  const { data, error } = await apiClient.GET("/api/dashboard/activity", {
    params: { query: { limit } },
  });
  if (error) throw error;
  return data as DashboardActivity[];
}

export async function getExpiringLeasesApi(dayThreshold?: number): Promise<ExpiringLease[]> {
  const { data, error } = await apiClient.GET("/api/dashboard/expiring-leases", {
    params: { query: { dayThreshold } },
  });
  if (error) throw error;
  return data as ExpiringLease[];
}

export async function getTenantDashboardApi(): Promise<TenantDashboard> {
  const { data, error } = await apiClient.GET("/api/dashboard/tenant");
  if (error) throw error;
  return data as TenantDashboard;
}
