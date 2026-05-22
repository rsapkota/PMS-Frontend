import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, CreditCard, Mail, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatNPR } from "@/lib/currency";
import { getLeasesApi, type LeaseDto } from "@/lib/api/leases";
import {
  DEFAULT_RENT_INVOICE_REMINDER_POLICY,
  getLeaseRentReminderPolicyApi,
  saveLeaseRentReminderPolicyApi,
  type RentInvoiceReminderPolicy,
} from "@/lib/api/reminders";

type LeaseLocationState = {
  lease?: LeaseDto | null;
};

function statusTone(status: string) {
  if (status === "Active") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (status === "Expiring") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (status === "Closed") return "bg-muted text-muted-foreground border-border";
  return "";
}

function prettyDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LeaseDetails() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LeaseLocationState | null;

  const [lease, setLease] = useState<LeaseDto | null>(state?.lease ?? null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [useGlobalPolicy, setUseGlobalPolicy] = useState(true);
  const [leasePolicy, setLeasePolicy] = useState<RentInvoiceReminderPolicy>(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
  const [beforeDueInput, setBeforeDueInput] = useState("7, 1");
  const [afterDueInput, setAfterDueInput] = useState("3");
  const [includeDueDate, setIncludeDueDate] = useState(true);

  usePageTitle("Lease Details");

  useEffect(() => {
    if (!leaseId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getLeasesApi({ Page: 1, PageSize: 50, Search: leaseId })
      .then((result) => {
        if (cancelled) return;
        const found = result.items.find((item) => String(item.id) === String(leaseId)) ?? null;
        setLease(found);
        setNotFound(!found);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leaseId]);

  useEffect(() => {
    if (!lease?.id) return;

    let cancelled = false;
    setPolicyLoading(true);

    getLeaseRentReminderPolicyApi(String(lease.id))
      .then((policy) => {
        if (cancelled) return;
        if (!policy) {
          setUseGlobalPolicy(true);
          setLeasePolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
          syncMilestoneInputsFromPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
          return;
        }
        setUseGlobalPolicy(false);
        setLeasePolicy(policy);
        syncMilestoneInputsFromPolicy(policy);
      })
      .catch(() => {
        if (cancelled) return;
        setUseGlobalPolicy(true);
        setLeasePolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
        syncMilestoneInputsFromPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lease?.id]);

  const syncMilestoneInputsFromPolicy = (policy: RentInvoiceReminderPolicy) => {
    const offsets = policy.milestoneOffsetsDays;
    const before = offsets.filter((offset) => offset < 0).map((offset) => Math.abs(offset)).sort((a, b) => b - a);
    const after = offsets.filter((offset) => offset > 0).sort((a, b) => a - b);
    setBeforeDueInput(before.join(", "));
    setAfterDueInput(after.join(", "));
    setIncludeDueDate(offsets.includes(0));
  };

  const parsePositiveDaysInput = (value: string) => {
    const offsets = value
      .split(",")
      .map((token) => Number(token.trim()))
      .filter((num) => Number.isFinite(num) && num > 0 && num <= 60);

    return Array.from(new Set(offsets.map((num) => Math.trunc(num)))).sort((a, b) => a - b);
  };

  const computedMilestoneOffsets = useMemo(() => {
    const beforeOffsets = parsePositiveDaysInput(beforeDueInput).map((day) => -day);
    const afterOffsets = parsePositiveDaysInput(afterDueInput);
    return Array.from(new Set([...beforeOffsets, ...(includeDueDate ? [0] : []), ...afterOffsets])).sort((a, b) => a - b);
  }, [beforeDueInput, afterDueInput, includeDueDate]);

  const handleSaveLeasePolicy = async () => {
    if (!lease?.id) return;
    setPolicySaving(true);
    try {
      const payload = useGlobalPolicy
        ? null
        : {
            ...leasePolicy,
            milestoneOffsetsDays: computedMilestoneOffsets,
          };
      const result = await saveLeaseRentReminderPolicyApi(String(lease.id), payload);
      if (result.storedRemotely) {
        toast.success("Lease reminder policy saved.");
      } else {
        toast.success("Saved locally.", {
          description: "Backend endpoint is unavailable, so lease override was stored in this browser.",
        });
      }
    } catch {
      toast.error("Failed to save lease reminder policy.");
    } finally {
      setPolicySaving(false);
    }
  };

  const leasePolicyControlsDisabled = !leasePolicy.enabled;

  const leaseDuration = useMemo(() => {
    if (!lease?.leaseStart || !lease?.leaseEnd) return "-";
    const start = new Date(lease.leaseStart);
    const end = new Date(lease.leaseEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

    const months = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    );

    return `${months} month${months > 1 ? "s" : ""}`;
  }, [lease]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="h-9 w-64 rounded bg-muted animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !lease) {
    return (
      <div className="flex h-[65vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Lease not found</h2>
        <p className="text-sm text-muted-foreground">The requested lease could not be loaded.</p>
        <Button onClick={() => navigate("/leases")}>Back to Leases</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lease #{lease.id}</h1>
            <p className="text-sm text-muted-foreground">Detailed contract and billing overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPolicyModalOpen(true)}>
            Rent Reminder Override
          </Button>
          <Badge className={statusTone(lease.status)}>{lease.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-xl shadow-foreground/5 lg:col-span-2 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-primary" />
              Tenant & Property
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Tenant</p>
              <p className="text-2xl font-bold">{lease.tenantName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {lease.tenantEmail}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Property</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {lease.propertyName}
              </p>
              <p className="text-sm text-muted-foreground">Unit {lease.unitNumber}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-foreground/5">
          <CardHeader>
            <CardTitle className="text-base">Payment Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monthly Rent</p>
              <p className="text-2xl font-black mt-1">{formatNPR(lease.rentAmount)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Security Deposit</p>
              <p className="text-xl font-bold mt-1">{formatNPR(lease.securityDeposit)}</p>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Due every month on day {lease.dueDay}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          icon={<CalendarDays className="h-4 w-4 text-blue-500" />}
          label="Lease Start"
          value={prettyDate(lease.leaseStart)}
          hint="Contract start"
        />
        <MetricCard
          icon={<CalendarDays className="h-4 w-4 text-amber-500" />}
          label="Lease End"
          value={prettyDate(lease.leaseEnd)}
          hint="Contract expiry"
        />
        <MetricCard
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
          label="Contract Length"
          value={leaseDuration}
          hint="Calculated term"
        />
      </div>

      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Rent Reminder Override</DialogTitle>
            <DialogDescription>
              Use global reminder defaults or define custom reminder frequency for this lease.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2 md:max-w-sm">
              <Label>Policy Source</Label>
              <Select
                value={useGlobalPolicy ? "global" : "custom"}
                onValueChange={(v) => setUseGlobalPolicy(v === "global")}
                disabled={policyLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Use global defaults</SelectItem>
                  <SelectItem value="custom">Use custom lease policy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!useGlobalPolicy && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Enabled</Label>
                  <SlidingToggle
                    checked={leasePolicy.enabled}
                    onChange={(next) => setLeasePolicy((prev) => ({ ...prev, enabled: next }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Recurring Follow-up</Label>
                  <SlidingToggle
                    checked={leasePolicy.recurringEnabled}
                    onChange={(next) => setLeasePolicy((prev) => ({ ...prev, recurringEnabled: next }))}
                    disabled={leasePolicyControlsDisabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Every N Days</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={leasePolicy.recurringIntervalDays}
                    disabled={leasePolicyControlsDisabled || !leasePolicy.recurringEnabled}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) return;
                      setLeasePolicy((prev) => ({ ...prev, recurringIntervalDays: Math.max(1, Math.min(60, Math.trunc(next))) }));
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Sends (blank = no cap)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={leasePolicy.recurringMaxOccurrences ?? ""}
                    disabled={leasePolicyControlsDisabled || !leasePolicy.recurringEnabled}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        setLeasePolicy((prev) => ({ ...prev, recurringMaxOccurrences: null }));
                        return;
                      }
                      const next = Number(raw);
                      if (!Number.isFinite(next)) return;
                      setLeasePolicy((prev) => ({ ...prev, recurringMaxOccurrences: Math.max(1, Math.min(24, Math.trunc(next))) }));
                    }}
                  />
                </div>
                <div className={`grid gap-3 md:col-span-2 lg:col-span-4 ${!leasePolicy.enabled ? "opacity-50" : ""}`}>
                  <Label>Milestone Schedule</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Days Before Due Date</Label>
                      <Input
                        value={beforeDueInput}
                        placeholder="7, 1"
                        disabled={leasePolicyControlsDisabled}
                        onChange={(e) => {
                          setBeforeDueInput(e.target.value);
                        }}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Days After Due Date</Label>
                      <Input
                        value={afterDueInput}
                        placeholder="3, 7"
                        disabled={leasePolicyControlsDisabled}
                        onChange={(e) => {
                          setAfterDueInput(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Send on Due Date</p>
                      <p className="text-xs text-muted-foreground">Adds a reminder exactly on the invoice due date.</p>
                    </div>
                    <SlidingToggle
                      checked={includeDueDate}
                      onChange={setIncludeDueDate}
                      disabled={leasePolicyControlsDisabled}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPolicyModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveLeasePolicy} disabled={policyLoading || policySaving}>
              {policySaving ? "Saving..." : "Save Lease Reminder Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlidingToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-9 w-16 items-center rounded-full border p-1 transition ${checked ? "bg-primary border-primary" : "bg-muted border-border"}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`h-7 w-7 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-7" : "translate-x-0"}`}
      />
      <span className="sr-only">{checked ? "Enabled" : "Disabled"}</span>
    </button>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="mt-2 text-xl font-black">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
