import { apiClient } from "./client";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ReminderDto {
  id: string;
  tenantName: string;
  tenantId: number;
  type: string;
  channel: string;
  status: string;
  message: string;
  propertyName: string;
  unitNumber: string;
  sentAt: string;
  sentDate: string;
  sentTime: string;
}

export interface PaginatedReminders {
  items: ReminderDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface GetRemindersParams {
  Page?: number;
  PageSize?: number;
  Search?: string;
  Type?: string;
}

export interface SendReminderRequest {
  tenantName: string;
  type: string;
  message: string;
}

export interface RentInvoiceReminderPolicy {
  enabled: boolean;
  channel: "Email";
  milestoneOffsetsDays: number[];
  recurringEnabled: boolean;
  recurringIntervalDays: number;
  recurringMaxOccurrences: number | null;
  stopOnPaid: boolean;
  timezone: string;
}

export interface ReminderPreviewItem {
  kind: "milestone" | "recurring";
  offsetDays?: number;
  scheduledAt: string;
  label: string;
}

export interface RentReminderPreviewRequest {
  dueDate: string;
  leaseId?: number | string;
  policy?: RentInvoiceReminderPolicy;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5135";
const GLOBAL_POLICY_STORAGE_KEY = "rent-invoice-reminder-policy-global";
const LEASE_POLICY_STORAGE_PREFIX = "rent-invoice-reminder-policy-lease-";

export const DEFAULT_RENT_INVOICE_REMINDER_POLICY: RentInvoiceReminderPolicy = {
  enabled: true,
  channel: "Email",
  milestoneOffsetsDays: [-7, -1, 0, 3],
  recurringEnabled: true,
  recurringIntervalDays: 7,
  recurringMaxOccurrences: null,
  stopOnPaid: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeOffsets(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => Math.trunc(value)))).sort((a, b) => a - b);
}

function normalizePolicy(raw: Partial<RentInvoiceReminderPolicy> | null | undefined): RentInvoiceReminderPolicy {
  const base = raw ?? {};
  const offsets = Array.isArray(base.milestoneOffsetsDays)
    ? base.milestoneOffsetsDays
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= -60 && value <= 60)
    : DEFAULT_RENT_INVOICE_REMINDER_POLICY.milestoneOffsetsDays;

  const recurringInterval = Number(base.recurringIntervalDays);
  const recurringMaxOccurrencesRaw = base.recurringMaxOccurrences;
  const recurringMaxOccurrences = recurringMaxOccurrencesRaw == null
    ? null
    : Number(recurringMaxOccurrencesRaw);

  return {
    enabled: Boolean(base.enabled ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY.enabled),
    channel: "Email",
    milestoneOffsetsDays: normalizeOffsets(offsets),
    recurringEnabled: Boolean(base.recurringEnabled ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY.recurringEnabled),
    recurringIntervalDays:
      Number.isFinite(recurringInterval) && recurringInterval > 0 ? Math.trunc(recurringInterval) : DEFAULT_RENT_INVOICE_REMINDER_POLICY.recurringIntervalDays,
    recurringMaxOccurrences:
      recurringMaxOccurrences == null || !Number.isFinite(recurringMaxOccurrences) || recurringMaxOccurrences <= 0
        ? null
        : Math.trunc(recurringMaxOccurrences),
    stopOnPaid: Boolean(base.stopOnPaid ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY.stopOnPaid),
    timezone: String(base.timezone ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY.timezone),
  };
}

function normalizePreviewItem(raw: unknown): ReminderPreviewItem | null {
  const item = (raw ?? {}) as Record<string, unknown>;
  const kindRaw = String(item.kind ?? item.Kind ?? "").toLowerCase();
  const kind: "milestone" | "recurring" = kindRaw === "recurring" ? "recurring" : "milestone";
  const scheduledAt = String(item.scheduledAt ?? item.ScheduledAt ?? item.date ?? item.Date ?? "");
  const label = String(item.label ?? item.Label ?? "");
  const offsetRaw = item.offsetDays ?? item.OffsetDays;
  const offsetDays = offsetRaw == null ? undefined : Number(offsetRaw);

  if (!scheduledAt || !label) return null;

  return {
    kind,
    offsetDays: Number.isFinite(offsetDays) ? Math.trunc(offsetDays) : undefined,
    scheduledAt,
    label,
  };
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStoredPolicy(raw: string | null): RentInvoiceReminderPolicy | null {
  if (!raw) return null;
  try {
    return normalizePolicy(JSON.parse(raw) as Partial<RentInvoiceReminderPolicy>);
  } catch {
    return null;
  }
}

function loadGlobalPolicyFromStorage(): RentInvoiceReminderPolicy {
  const stored = parseStoredPolicy(localStorage.getItem(GLOBAL_POLICY_STORAGE_KEY));
  return stored ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY;
}

function saveGlobalPolicyToStorage(policy: RentInvoiceReminderPolicy): void {
  localStorage.setItem(GLOBAL_POLICY_STORAGE_KEY, JSON.stringify(policy));
}

function loadLeasePolicyFromStorage(leaseId: number | string): RentInvoiceReminderPolicy | null {
  const key = `${LEASE_POLICY_STORAGE_PREFIX}${leaseId}`;
  return parseStoredPolicy(localStorage.getItem(key));
}

function saveLeasePolicyToStorage(leaseId: number | string, policy: RentInvoiceReminderPolicy | null): void {
  const key = `${LEASE_POLICY_STORAGE_PREFIX}${leaseId}`;
  if (!policy) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(policy));
}

async function tryRequestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getDefaultReminderPreviewDueDate(): string {
  const base = new Date();
  base.setDate(base.getDate() + 7);
  return toLocalDateString(base);
}

export function buildRentReminderPreview(
  policy: RentInvoiceReminderPolicy,
  dueDate: string,
): ReminderPreviewItem[] {
  const parsedDueDate = new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime()) || !policy.enabled) return [];

  const reminders: ReminderPreviewItem[] = [];

  for (const offset of policy.milestoneOffsetsDays) {
    const date = new Date(parsedDueDate);
    date.setDate(parsedDueDate.getDate() + offset);
    reminders.push({
      kind: "milestone",
      offsetDays: offset,
      scheduledAt: toLocalDateString(date),
      label:
        offset < 0
          ? `${Math.abs(offset)} day(s) before due date`
          : offset === 0
            ? "Due date"
            : `${offset} day(s) overdue`,
    });
  }

  if (policy.recurringEnabled) {
    const max = policy.recurringMaxOccurrences ?? 3;
    for (let i = 1; i <= max; i += 1) {
      const offset = i * policy.recurringIntervalDays;
      const date = new Date(parsedDueDate);
      date.setDate(parsedDueDate.getDate() + offset);
      reminders.push({
        kind: "recurring",
        scheduledAt: toLocalDateString(date),
        label: `Recurring follow-up #${i} (${offset} day(s) overdue)`,
      });
    }
  }

  reminders.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return reminders;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getRemindersApi(params: GetRemindersParams): Promise<PaginatedReminders> {
  const { data, error } = await apiClient.GET("/api/reminders", {
    params: { query: params },
  });
  if (error) throw error;
  return data as PaginatedReminders;
}

export async function sendReminderApi(body: SendReminderRequest): Promise<void> {
  const { error } = await apiClient.POST("/api/reminders/send", { body });
  if (error) throw error;
}

export async function resendReminderApi(reminderId: string): Promise<void> {
  const { error } = await apiClient.POST("/api/reminders/{reminderId}/resend", {
    params: { path: { reminderId } },
  });
  if (error) throw error;
}

export async function getGlobalRentReminderPolicyApi(): Promise<RentInvoiceReminderPolicy> {
  const remote = await tryRequestJson<Partial<RentInvoiceReminderPolicy>>(
    `${BASE_URL}/api/reminders/policies/rent-invoice`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
    },
  );

  if (remote) {
    const policy = normalizePolicy(remote);
    saveGlobalPolicyToStorage(policy);
    return policy;
  }

  return loadGlobalPolicyFromStorage();
}

export async function saveGlobalRentReminderPolicyApi(
  policy: RentInvoiceReminderPolicy,
): Promise<{ storedRemotely: boolean }> {
  const normalized = normalizePolicy(policy);

  try {
    const response = await fetch(`${BASE_URL}/api/reminders/policies/rent-invoice`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(normalized),
    });

    if (response.ok) {
      saveGlobalPolicyToStorage(normalized);
      return { storedRemotely: true };
    }
  } catch {
    // Fall back to local persistence when backend endpoint is unavailable.
  }

  saveGlobalPolicyToStorage(normalized);
  return { storedRemotely: false };
}

export async function getLeaseRentReminderPolicyApi(
  leaseId: number | string,
): Promise<RentInvoiceReminderPolicy | null> {
  const remote = await tryRequestJson<Partial<RentInvoiceReminderPolicy>>(
    `${BASE_URL}/api/reminders/policies/rent-invoice/leases/${leaseId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(),
      },
    },
  );

  if (remote) {
    const policy = normalizePolicy(remote);
    saveLeasePolicyToStorage(leaseId, policy);
    return policy;
  }

  return loadLeasePolicyFromStorage(leaseId);
}

export async function saveLeaseRentReminderPolicyApi(
  leaseId: number | string,
  policy: RentInvoiceReminderPolicy | null,
): Promise<{ storedRemotely: boolean }> {
  const normalized = policy ? normalizePolicy(policy) : null;
  const method = normalized ? "PUT" : "DELETE";

  try {
    const response = await fetch(`${BASE_URL}/api/reminders/policies/rent-invoice/leases/${leaseId}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: normalized ? JSON.stringify(normalized) : undefined,
    });

    if (response.ok) {
      saveLeasePolicyToStorage(leaseId, normalized);
      return { storedRemotely: true };
    }
  } catch {
    // Fall back to local persistence when backend endpoint is unavailable.
  }

  saveLeasePolicyToStorage(leaseId, normalized);
  return { storedRemotely: false };
}

export async function previewRentReminderScheduleApi(
  request: RentReminderPreviewRequest,
): Promise<{ items: ReminderPreviewItem[]; source: "remote" | "local" }> {
  const body = {
    dueDate: request.dueDate,
    leaseId: request.leaseId,
    policy: request.policy ? normalizePolicy(request.policy) : undefined,
  };

  const remote = await tryRequestJson<unknown>(`${BASE_URL}/api/reminders/policies/rent-invoice/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (remote != null) {
    const list = Array.isArray(remote)
      ? remote
      : Array.isArray((remote as { items?: unknown[] }).items)
        ? (remote as { items: unknown[] }).items
        : [];

    const items = list
      .map(normalizePreviewItem)
      .filter((item): item is ReminderPreviewItem => item !== null)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    return { items, source: "remote" };
  }

  const items = buildRentReminderPreview(body.policy ?? DEFAULT_RENT_INVOICE_REMINDER_POLICY, request.dueDate);
  return { items, source: "local" };
}
