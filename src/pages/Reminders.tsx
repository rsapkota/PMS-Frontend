import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { 
  Bell, Mail, MessageSquare, Search, 
  Filter, Clock, AlertCircle, 
  ChevronLeft, ChevronRight, Download, Eye,
  Building2, RefreshCcw, Send
} from "lucide-react";
import {
  DEFAULT_RENT_INVOICE_REMINDER_POLICY,
  getDefaultReminderPreviewDueDate,
  getGlobalRentReminderPolicyApi,
  previewRentReminderScheduleApi,
  getRemindersApi,
  sendReminderApi,
  saveGlobalRentReminderPolicyApi,
  resendReminderApi,
  type ReminderPreviewItem,
  type RentInvoiceReminderPolicy,
  type ReminderDto,
} from "@/lib/api/reminders";

export default function Reminders() {
  usePageTitle("Reminders");

  // API state
  const [reminders, setReminders] = useState<ReminderDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resendTarget, setResendTarget] = useState<ReminderDto | null>(null);
  const [isNewNoticeOpen, setIsNewNoticeOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [rentPolicy, setRentPolicy] = useState<RentInvoiceReminderPolicy>(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
  const [previewDueDate, setPreviewDueDate] = useState(getDefaultReminderPreviewDueDate());
  const [beforeDueInput, setBeforeDueInput] = useState("7, 1");
  const [afterDueInput, setAfterDueInput] = useState("3");
  const [includeDueDate, setIncludeDueDate] = useState(true);
  const [previewItems, setPreviewItems] = useState<ReminderPreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSource, setPreviewSource] = useState<"remote" | "local">("local");

  // New notice form state
  const [noticeTenant, setNoticeTenant] = useState("");
  const [noticeType, setNoticeType] = useState("Rent Reminder");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeErrors, setNoticeErrors] = useState<Record<string, string>>({});

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + reminders.length;

  const loadReminders = useCallback(async (page: number, size: number, search: string, type: string) => {
    try {
      const res = await getRemindersApi({
        Page: page, PageSize: size,
        Search: search || undefined,
        Type: type !== "all" ? type : undefined,
      });
      setReminders(res.items);
      setTotalItems(res.totalItems);
      setTotalPages(res.totalPages);
    } catch {
      toast.error("Failed to load reminders.");
    }
  }, []);

  useEffect(() => {
    loadReminders(currentPage, pageSize, searchTerm, filterType);
  }, [currentPage, pageSize, searchTerm, filterType, loadReminders]);

  useEffect(() => {
    let cancelled = false;
    setPolicyLoading(true);

    getGlobalRentReminderPolicyApi()
      .then((policy) => {
        if (!cancelled) {
          setRentPolicy(policy);
          syncMilestoneInputsFromPolicy(policy);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRentPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
          syncMilestoneInputsFromPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
          toast.error("Failed to load reminder defaults. Showing local defaults.");
        }
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const policyWithComputedMilestones = useMemo(
    () => ({
      ...rentPolicy,
      milestoneOffsetsDays: computedMilestoneOffsets,
    }),
    [rentPolicy, computedMilestoneOffsets],
  );

  useEffect(() => {
    let cancelled = false;

    if (!previewDueDate) {
      setPreviewItems([]);
      return;
    }

    setPreviewLoading(true);
    previewRentReminderScheduleApi({ dueDate: previewDueDate, policy: policyWithComputedMilestones })
      .then((res) => {
        if (cancelled) return;
        setPreviewItems(res.items);
        setPreviewSource(res.source);
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewItems([]);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [policyWithComputedMilestones, previewDueDate]);

  const handleSavePolicy = async () => {
    setPolicySaving(true);
    try {
      const result = await saveGlobalRentReminderPolicyApi(policyWithComputedMilestones);
      if (result.storedRemotely) {
        toast.success("Rent reminder defaults saved.");
      } else {
        toast.success("Saved locally.", {
          description: "Backend endpoint is unavailable, so settings were stored in this browser.",
        });
      }
    } catch {
      toast.error("Failed to save reminder defaults.");
    } finally {
      setPolicySaving(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    }, 400);
  };

  const handleExportLog = () => {
    const headers = "ID,Tenant,Unit,Property,Type,Channel,Sent Date,Status";
    const rows = reminders.map(r => `${r.id},${r.tenantName},${r.unitNumber},${r.propertyName},${r.type},${r.channel},${r.sentDate},${r.status}`).join("\n");
    const csv = headers + "\n" + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "communications-log.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Log exported!", { description: `${reminders.length} communication records downloaded.` });
  };

  const validateNotice = () => {
    const errors: Record<string, string> = {};
    if (!noticeTenant.trim()) errors.tenant = "Tenant name is required.";
    if (!noticeMessage.trim()) errors.message = "Message content is required.";
    setNoticeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendNotice = () => {
    if (!validateNotice()) return;
    const t = noticeTenant;
    sendReminderApi({ tenantName: t, type: noticeType, message: noticeMessage }).then(() => {
      setIsNewNoticeOpen(false);
      setNoticeTenant(""); setNoticeMessage(""); setNoticeErrors({});
      toast.success("Notice sent!", { description: `${noticeType} has been sent to ${t}.` });
      loadReminders(currentPage, pageSize, searchTerm, filterType);
    }).catch(() => toast.error("Failed to send notice."));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Opened":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Opened</Badge>;
      case "Delivered":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Delivered</Badge>;
      case "Failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "Email": return <Mail className="h-3 w-3" />;
      case "SMS": return <MessageSquare className="h-3 w-3" />;
      default: return <Bell className="h-3 w-3" />;
    }
  };

  const policyControlsDisabled = policyLoading || !rentPolicy.enabled;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track reminders, notifications, and engagement with your tenants.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsPolicyModalOpen(true)}>
            <Bell className="h-4 w-4" />
            Reminder Defaults
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportLog}>
            <Download className="h-4 w-4" />
            Export Log
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsNewNoticeOpen(true)}>
            <Send className="h-4 w-4" />
            Send New Notice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <ReminderStatCard label="Sent Today" value="128" icon={<Send className="h-4 w-4 text-primary" />} subtext="Across all channels" />
        <ReminderStatCard label="Open Rate" value="84%" icon={<Eye className="h-4 w-4 text-emerald-500" />} subtext="+2.5% from last week" />
        <ReminderStatCard label="Scheduled" value="12" icon={<Clock className="h-4 w-4 text-amber-500" />} subtext="Next 24 hours" />
        <ReminderStatCard label="Delivery Failures" value="3" icon={<AlertCircle className="h-4 w-4 text-red-500" />} subtext="Requires attention" />
      </div>

      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Rent Invoice Reminder Defaults</DialogTitle>
            <DialogDescription>
              Configure global default frequency for rent invoice reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex justify-end">
              <Badge variant="outline">Email channel</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label>Enabled</Label>
                <SlidingToggle
                  checked={rentPolicy.enabled}
                  onChange={(next) => setRentPolicy((prev) => ({ ...prev, enabled: next }))}
                  disabled={policyLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label>Recurring Follow-up</Label>
                <SlidingToggle
                  checked={rentPolicy.recurringEnabled}
                  onChange={(next) => setRentPolicy((prev) => ({ ...prev, recurringEnabled: next }))}
                  disabled={policyControlsDisabled}
                />
              </div>

              <div className="grid gap-2">
                <Label>Recurring Every N Days</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={rentPolicy.recurringIntervalDays}
                  disabled={policyControlsDisabled || !rentPolicy.recurringEnabled}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next)) return;
                    setRentPolicy((prev) => ({ ...prev, recurringIntervalDays: Math.max(1, Math.min(60, Math.trunc(next))) }));
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label>Max Recurring Sends (blank = no cap)</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={rentPolicy.recurringMaxOccurrences ?? ""}
                  disabled={policyControlsDisabled || !rentPolicy.recurringEnabled}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (!raw) {
                      setRentPolicy((prev) => ({ ...prev, recurringMaxOccurrences: null }));
                      return;
                    }
                    const next = Number(raw);
                    if (!Number.isFinite(next)) return;
                    setRentPolicy((prev) => ({ ...prev, recurringMaxOccurrences: Math.max(1, Math.min(24, Math.trunc(next))) }));
                  }}
                />
              </div>
            </div>

            <div className={`grid gap-3 ${!rentPolicy.enabled ? "opacity-50" : ""}`}>
              <Label>Milestone Schedule</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Days Before Due Date</Label>
                  <Input
                    placeholder="7, 1"
                    value={beforeDueInput}
                    disabled={policyControlsDisabled}
                    onChange={(e) => {
                      setBeforeDueInput(e.target.value);
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Days After Due Date</Label>
                  <Input
                    placeholder="3, 7"
                    value={afterDueInput}
                    disabled={policyControlsDisabled}
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
                  disabled={policyControlsDisabled}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>How this works</Label>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Use positive numbers only. Example: Before = 7,1 and After = 3 means reminders are sent 7 days before, 1 day before, on due date (if enabled), and 3 days overdue.
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Preview Using Due Date</Label>
              <Input
                type="date"
                value={previewDueDate}
                onChange={(e) => setPreviewDueDate(e.target.value)}
                disabled={policyControlsDisabled}
                className="max-w-[220px]"
              />
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Upcoming reminder schedule preview</p>
                  <Badge variant="outline" className="text-[10px]">
                    {previewSource === "remote" ? "Server" : "Local fallback"}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {previewLoading && <p className="text-xs text-muted-foreground">Loading preview...</p>}
                  {previewItems.length === 0 && (
                    <p className="text-xs text-muted-foreground">{previewLoading ? "" : "No reminders will be sent with the current settings."}</p>
                  )}
                  {previewItems.map((item, index) => (
                    <div key={`${item.scheduledAt}-${index}`} className="flex items-center justify-between text-xs">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.scheduledAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRentPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
                syncMilestoneInputsFromPolicy(DEFAULT_RENT_INVOICE_REMINDER_POLICY);
              }}
              disabled={policyLoading || policySaving}
            >
              Reset Defaults
            </Button>
            <Button onClick={handleSavePolicy} disabled={policyLoading || policySaving}>
              {policySaving ? "Saving..." : "Save Default Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewNoticeOpen} onOpenChange={(open) => { setIsNewNoticeOpen(open); if (!open) setNoticeErrors({}); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Send New Notice</DialogTitle>
            <DialogDescription>Compose and send a notice to a tenant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="noticeTenant">Recipient (Tenant Name)</Label>
              <Input id="noticeTenant" placeholder="e.g. John Doe" value={noticeTenant} onChange={e => { setNoticeTenant(e.target.value); setNoticeErrors(prev => ({ ...prev, tenant: "" })); }} />
              {noticeErrors.tenant && <p className="text-xs text-destructive">{noticeErrors.tenant}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Notice Type</Label>
              <Select value={noticeType} onValueChange={(v) => v != null && setNoticeType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rent Reminder">Rent Reminder</SelectItem>
                  <SelectItem value="Lease Expiry">Lease Expiry</SelectItem>
                  <SelectItem value="Maintenance Update">Maintenance Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="noticeMessage">Message</Label>
              <Textarea id="noticeMessage" placeholder="Enter your message here..." rows={4} value={noticeMessage} onChange={e => { setNoticeMessage(e.target.value); setNoticeErrors(prev => ({ ...prev, message: "" })); }} />
              {noticeErrors.message && <p className="text-xs text-destructive">{noticeErrors.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNewNoticeOpen(false); setNoticeErrors({}); }}>Cancel</Button>
            <Button onClick={handleSendNotice}>Send Notice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resendTarget !== null}
        onOpenChange={(open) => { if (!open) setResendTarget(null); }}
        title="Resend Reminder"
        description={resendTarget ? `Resend "${resendTarget.type}" to ${resendTarget.tenantName} via ${resendTarget.channel}?` : ""}
        confirmLabel="Resend"
        onConfirm={() => {
          if (!resendTarget) return;
          resendReminderApi(String(resendTarget.id)).then(() => {
            toast.success("Reminder resent!", { description: `${resendTarget.type} has been resent to ${resendTarget.tenantName}.` });
            setResendTarget(null);
            loadReminders(currentPage, pageSize, searchTerm, filterType);
          }).catch(() => toast.error("Failed to resend reminder."));
        }}
      />

      {/* Main Tracking Card */}
      <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by tenant, building, or type..." 
                className="pl-9 bg-background border-muted" 
                value={searchInput}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={(v) => { if (v != null) { setFilterType(v); setCurrentPage(1); } }}>
                <SelectTrigger className="h-9 w-[160px] gap-1.5">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Rent Reminder">Rent Reminder</SelectItem>
                  <SelectItem value="Lease Expiry">Lease Expiry</SelectItem>
                  <SelectItem value="Maintenance Update">Maintenance Update</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-6 w-px bg-muted mx-1" />
              <p className="text-xs font-medium text-muted-foreground">
                {totalItems} recorded communications
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="pl-6 py-4">Recipient</TableHead>
                <TableHead>Communication Type</TableHead>
                <TableHead>Channel & Time</TableHead>
                <TableHead>Property Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((rem) => (
                <TableRow key={rem.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">
                        {rem.tenantName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{rem.tenantName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{rem.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold">{rem.type}</p>
                      <p className="text-[10px] text-muted-foreground italic">Automated system alert</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold h-4 px-1.5 gap-1 border-muted-foreground/20">
                          {getChannelIcon(rem.channel)}
                          {rem.channel}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {rem.sentDate} at {rem.sentTime}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[11px] font-bold text-foreground">{rem.propertyName}</p>
                        <p className="text-[10px] text-muted-foreground">Unit {rem.unitNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(rem.status)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="View details" onClick={() => toast.info(rem.type, { description: `Sent to ${rem.tenantName} (Unit ${rem.unitNumber}, ${rem.propertyName}) on ${rem.sentDate} at ${rem.sentTime} via ${rem.channel}. Status: ${rem.status}.` })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Resend" onClick={() => setResendTarget(rem)}>
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="p-4 bg-muted/10 border-t flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{startIndex + 1}</span> to <span className="text-foreground">{endIndex}</span> of <span className="text-foreground">{totalItems}</span> records
            </p>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { if (v) { setPageSize(Number(v)); setCurrentPage(1); } }}>
                <SelectTrigger className="h-8 w-[70px] bg-background text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-[10px]">5</SelectItem>
                  <SelectItem value="10" className="text-[10px]">10</SelectItem>
                  <SelectItem value="25" className="text-[10px]">25</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-3 h-8 rounded-lg bg-background border text-xs font-bold">
              {currentPage} / {totalPages || 1}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
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

function ReminderStatCard({ label, value, icon, subtext }: { label: string, value: string, icon: React.ReactNode, subtext: string }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{subtext}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
