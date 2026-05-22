import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Search, Plus, AlertCircle, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, MoreVertical, Building2, Hammer, Wind,
  Droplets, Zap, ShieldAlert, XCircle, X,
  ArrowUp, ArrowDown, ArrowUpDown, Flame, Edit2,
  UserCog, RefreshCw, Eye, Paperclip,
  TrendingUp, TrendingDown, Trash2, Calendar,
} from "lucide-react";
import {
  getMaintenanceApi,
  getMaintenanceSummaryApi,
  createMaintenanceApi,
  updateMaintenanceApi,
  updateMaintenanceStatusApi,
  reassignTechnicianApi,
  deleteMaintenanceApi,
  bulkMaintenanceApi,
  type MaintenanceTaskDto,
  type MaintenanceSummaryDto,
} from "@/lib/api/maintenance";

// ─── Constants ──────────────────────────────────────────────────────────────
const TECHNICIANS = ["Mike Smith", "David Wilson", "Anna Lee", "Carlos Reyes"];
const PROPERTIES = [
  { id: 1, name: "Sunset Manor" },
  { id: 2, name: "Ocean View" },
  { id: 3, name: "Green Valley" },
];
const CATEGORIES = ["Plumbing", "Electrical", "HVAC", "Security", "General"];
const STATUSES = ["New", "In Progress", "Pending Parts", "Completed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const STATUS_ORDER: Record<string, number> = { New: 4, "In Progress": 3, "Pending Parts": 2, Completed: 1 };
void PRIORITY_ORDER; void STATUS_ORDER;

// ─── Helper components ───────────────────────────────────────────────────────
function getPriorityBadge(priority: string) {
  const map: Record<string, string> = {
    Critical: "bg-red-500/10 text-red-600 border-red-500/20 font-black uppercase text-[9px]",
    High: "bg-orange-500/10 text-orange-600 border-orange-500/20 font-black uppercase text-[9px]",
    Medium: "bg-blue-500/10 text-blue-600 border-blue-500/20 font-black uppercase text-[9px]",
    Low: "bg-slate-500/10 text-slate-600 border-slate-500/20 font-black uppercase text-[9px]",
  };
  return <Badge className={map[priority] ?? ""}>{priority}</Badge>;
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    New: "bg-primary/10 text-primary border-primary/20 font-bold",
    "In Progress": "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold",
    "Pending Parts": "bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold",
    Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Plumbing": return <Droplets className="h-4 w-4 text-blue-500" />;
    case "Electrical": return <Zap className="h-4 w-4 text-amber-500" />;
    case "HVAC": return <Wind className="h-4 w-4 text-emerald-500" />;
    case "Security": return <ShieldAlert className="h-4 w-4 text-red-500" />;
    default: return <Hammer className="h-4 w-4 text-muted-foreground" />;
  }
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string | null; sortDir: "asc" | "desc" }) {
  if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Critical: "bg-red-500", High: "bg-orange-500", Medium: "bg-blue-500", Low: "bg-slate-400",
  };
  return <span className={`h-2 w-2 rounded-full shrink-0 ${colors[priority] ?? "bg-slate-400"}`} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Maintenance() {
  usePageTitle("Maintenance");

  // API state
  const [tasks, setTasks] = useState<MaintenanceTaskDto[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummaryDto | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters & sort
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog state
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [editTask, setEditTask] = useState<MaintenanceTaskDto | null>(null);
  const [detailTask, setDetailTask] = useState<MaintenanceTaskDto | null>(null);
  const [statusTaskId, setStatusTaskId] = useState<string | null>(null);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"complete" | "cancel" | null>(null);

  // New request form
  const [reqTitle, setReqTitle] = useState("");
  const [reqProperty, setReqProperty] = useState("Sunset Manor");
  const [reqPriority, setReqPriority] = useState("Medium");
  const [reqUnit, setReqUnit] = useState("");
  const [reqCategory, setReqCategory] = useState("Plumbing");
  const [reqDescription, setReqDescription] = useState("");
  const [reqTechnician, setReqTechnician] = useState("Mike Smith");
  const [reqFileName, setReqFileName] = useState<string | null>(null);
  const [reqErrors, setReqErrors] = useState<Record<string, string>>({});

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTechnician, setEditTechnician] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Inline dialogs
  const [newStatus, setNewStatus] = useState("");
  const [newTechnician, setNewTechnician] = useState("");

  // Pagination jump
  const [jumpPage, setJumpPage] = useState("");

  // ── Derived ──
  const technicianStats = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.status !== "Completed") stats[t.technicianName] = (stats[t.technicianName] ?? 0) + 1;
    });
    return stats;
  }, [tasks]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + tasks.length;

  // ── Load data ──
  const loadTasks = useCallback(async (
    page: number, size: number, search: string,
    status: string, priority: string, category: string,
    sf: string | null, sd: "asc" | "desc"
  ) => {
    try {
      const res = await getMaintenanceApi({
        Page: page, PageSize: size,
        Search: search || undefined,
        Status: status !== "all" ? status : undefined,
        Priority: priority !== "all" ? priority : undefined,
        Category: category !== "all" ? category : undefined,
        SortBy: sf ?? undefined,
        SortDir: sd,
      });
      setTasks(res.items);
      setTotalItems(res.totalItems);
      setTotalPages(res.totalPages);
    } catch {
      toast.error("Failed to load maintenance tasks.");
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await getMaintenanceSummaryApi();
      setSummary(res);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
  }, [currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir, loadTasks]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const activeFilters = [
    filterStatus !== "all" && { key: "status", label: `Status: ${filterStatus}`, clear: () => { setFilterStatus("all"); setCurrentPage(1); } },
    filterPriority !== "all" && { key: "priority", label: `Priority: ${filterPriority}`, clear: () => { setFilterPriority("all"); setCurrentPage(1); } },
    filterCategory !== "all" && { key: "category", label: `Category: ${filterCategory}`, clear: () => { setFilterCategory("all"); setCurrentPage(1); } },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  // ── Handlers ──
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    }, 400);
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (v: string) => { setPageSize(Number(v)); setCurrentPage(1); };

  const handleExportCSV = () => {
    const headers = "ID,Title,Category,Priority,Status,Property,Unit,Tenant,Technician,Created";
    const rows = tasks.map((t) =>
      `${t.id},${t.title},${t.category},${t.priority},${t.status},${t.propertyName},${t.unitNumber},${t.tenantName},${t.technicianName},${t.createdAt}`
    ).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "maintenance-report.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!", { description: `${tasks.length} maintenance records downloaded.` });
  };

  const validateRequest = () => {
    const errors: Record<string, string> = {};
    if (!reqTitle.trim()) errors.title = "Issue title is required.";
    if (!reqUnit.trim()) errors.unit = "Unit number is required.";
    setReqErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRequest = () => {
    if (!validateRequest()) return;
    const propertyObj = PROPERTIES.find(p => p.name === reqProperty) ?? PROPERTIES[0];
    createMaintenanceApi({
      title: reqTitle,
      category: reqCategory,
      priority: reqPriority,
      propertyId: propertyObj.id,
      unitNumber: reqUnit,
      technicianName: reqTechnician,
      description: reqDescription,
    }).then(() => {
      setIsNewRequestOpen(false);
      setReqTitle(""); setReqUnit(""); setReqDescription(""); setReqFileName(null); setReqErrors({});
      toast.success("Request submitted!", { description: `Maintenance request for Unit ${reqUnit} has been logged.` });
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
      loadSummary();
    }).catch(() => toast.error("Failed to submit request."));
  };

  const openEdit = (task: MaintenanceTaskDto) => {
    setEditTask(task);
    setEditTitle(task.title); setEditUnit(task.unitNumber); setEditPriority(task.priority);
    setEditCategory(task.category); setEditTechnician(task.technicianName); setEditNotes(task.notes ?? "");
  };

  const handleSaveEdit = () => {
    if (!editTask) return;
    updateMaintenanceApi(String(editTask.id), {
      title: editTitle,
      unitNumber: editUnit,
      priority: editPriority,
      category: editCategory,
      technicianName: editTechnician,
      notes: editNotes,
    }).then(() => {
      toast.success("Task updated!", { description: `Task ${editTask.id} has been updated.` });
      setEditTask(null);
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
    }).catch(() => toast.error("Failed to update task."));
  };

  const handleMarkComplete = (id: string) => {
    updateMaintenanceStatusApi(id, { status: "Completed" }).then(() => {
      setConfirmComplete(null);
      toast.success("Task completed!", { description: `Maintenance task ${id} marked as completed.` });
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
      loadSummary();
    }).catch(() => toast.error("Failed to update task status."));
  };

  const handleCancelTask = (id: string) => {
    deleteMaintenanceApi(id).then(() => {
      setConfirmCancel(null);
      toast.success("Request cancelled", { description: `Maintenance task ${id} has been cancelled.` });
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
      loadSummary();
    }).catch(() => toast.error("Failed to cancel task."));
  };

  const openStatusUpdate = (task: MaintenanceTaskDto) => { setStatusTaskId(String(task.id)); setNewStatus(task.status); };
  const handleUpdateStatus = () => {
    if (!statusTaskId) return;
    updateMaintenanceStatusApi(statusTaskId, { status: newStatus }).then(() => {
      toast.success("Status updated!", { description: `Task ${statusTaskId} is now "${newStatus}".` });
      setStatusTaskId(null);
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
    }).catch(() => toast.error("Failed to update status."));
  };

  const openReassign = (task: MaintenanceTaskDto) => { setReassignTaskId(String(task.id)); setNewTechnician(task.technicianName); };
  const handleReassign = () => {
    if (!reassignTaskId) return;
    reassignTechnicianApi(reassignTaskId, { technicianName: newTechnician }).then(() => {
      toast.success("Technician reassigned!", { description: `Task ${reassignTaskId} assigned to ${newTechnician}.` });
      setReassignTaskId(null);
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
    }).catch(() => toast.error("Failed to reassign technician."));
  };

  // Bulk
  const allPageSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(String(t.id)));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allPageSelected ? tasks.forEach((t) => next.delete(String(t.id))) : tasks.forEach((t) => next.add(String(t.id)));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const handleBulkComplete = () => {
    bulkMaintenanceApi({ ids: Array.from(selectedIds), action: "complete" }).then(() => {
      toast.success(`${selectedIds.size} tasks marked as completed.`);
      setSelectedIds(new Set()); setBulkAction(null);
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
      loadSummary();
    }).catch(() => toast.error("Bulk action failed."));
  };
  const handleBulkCancel = () => {
    bulkMaintenanceApi({ ids: Array.from(selectedIds), action: "cancel" }).then(() => {
      toast.success(`${selectedIds.size} tasks cancelled.`);
      setSelectedIds(new Set()); setBulkAction(null);
      loadTasks(currentPage, pageSize, searchTerm, filterStatus, filterPriority, filterCategory, sortField, sortDir);
      loadSummary();
    }).catch(() => toast.error("Bulk action failed."));
  };

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const p = parseInt(jumpPage);
      if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p);
      setJumpPage("");
    }
  };

  const clearAllFilters = () => {
    setSearchInput(""); setSearchTerm(""); setFilterStatus("all"); setFilterPriority("all"); setFilterCategory("all"); setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage repair requests, technician schedules, and building upkeep.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />Export CSV
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20 rounded-xl" onClick={() => setIsNewRequestOpen(true)}>
            <Plus className="h-4 w-4" />New Request
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-6 md:grid-cols-4">
        <MaintenanceStatCard label="Active Tasks" value={summary ? String(summary.activeTasks) : "—"}
          icon={<Hammer className="h-5 w-5 text-primary" />} subtext="Current workload"
          trend={{ dir: "up", pct: "12%", label: "vs last month" }} />
        <MaintenanceStatCard label="Critical Issues" value={summary ? String(summary.criticalIssues) : "—"}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />} subtext="Immediate action"
          trend={{ dir: "down", pct: "2", label: "vs last month", good: true }} pulse={!!summary && summary.criticalIssues > 0} />
        <MaintenanceStatCard label="Avg. Resolution" value={summary ? `${summary.avgResolutionDays}d` : "—"}
          icon={<Clock className="h-5 w-5 text-amber-500" />} subtext="Last 30 days"
          trend={{ dir: "down", pct: "0.3d", label: "faster", good: true }} />
        <MaintenanceStatCard label="Tasks Completed" value={summary ? String(summary.tasksCompleted) : "—"}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} subtext="Total this year"
          trend={{ dir: "up", pct: "18%", label: "vs last month", good: true }} />
      </div>

      {/* ── New Request Dialog ── */}
      <Dialog open={isNewRequestOpen} onOpenChange={(open) => { setIsNewRequestOpen(open); if (!open) setReqErrors({}); }}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>Log a new repair or maintenance task for a unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Issue Title</Label>
              <Input placeholder="e.g. Leaking Faucet" value={reqTitle}
                onChange={(e) => { setReqTitle(e.target.value); setReqErrors((p) => ({ ...p, title: "" })); }} />
              {reqErrors.title && <p className="text-xs text-destructive">{reqErrors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={reqCategory} onValueChange={(v) => v && setReqCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={reqPriority} onValueChange={(v) => v && setReqPriority(v)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><PriorityDot priority={reqPriority} /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2"><PriorityDot priority={p} />{p}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Property</Label>
                <Select value={reqProperty} onValueChange={(v) => v && setReqProperty(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROPERTIES.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Unit Number</Label>
                <Input placeholder="e.g. 101" value={reqUnit}
                  onChange={(e) => { setReqUnit(e.target.value); setReqErrors((p) => ({ ...p, unit: "" })); }} />
                {reqErrors.unit && <p className="text-xs text-destructive">{reqErrors.unit}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assign Technician</Label>
              <Select value={reqTechnician} onValueChange={(v) => v && setReqTechnician(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the issue in detail..." rows={3}
                value={reqDescription} onChange={(e) => setReqDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Attach Photo (optional)</Label>
              <label className="flex items-center gap-3 cursor-pointer border border-dashed rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Paperclip className="h-4 w-4 shrink-0" />
                {reqFileName ?? "Click to attach an image"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setReqFileName(e.target.files?.[0]?.name ?? null)} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNewRequestOpen(false); setReqErrors({}); }}>Cancel</Button>
            <Button onClick={handleSubmitRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task — {editTask?.id}</DialogTitle>
            <DialogDescription>Update the details of this maintenance request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Issue Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={(v) => v && setEditCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => v && setEditPriority(v)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2"><PriorityDot priority={editPriority} /><SelectValue /></div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2"><PriorityDot priority={p} />{p}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit Number</Label>
                <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Technician</Label>
                <Select value={editTechnician} onValueChange={(v) => v && setEditTechnician(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TECHNICIANS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Discard</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog ── */}
      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null); }}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded-lg">{detailTask?.id}</span>
              {detailTask?.title}
            </DialogTitle>
            <DialogDescription>Full task information and details.</DialogDescription>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Category" value={
                  <div className="flex items-center gap-1.5">{getCategoryIcon(detailTask.category)}<span className="text-sm font-semibold">{detailTask.category}</span></div>
                } />
                <DetailField label="Priority" value={getPriorityBadge(detailTask.priority)} />
                <DetailField label="Status" value={getStatusBadge(detailTask.status)} />
                <DetailField label="Technician" value={
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">
                      {detailTask.technicianName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-semibold">{detailTask.technicianName}</span>
                  </div>
                } />
                <DetailField label="Property" value={<span className="text-sm font-semibold">{detailTask.propertyName}</span>} />
                <DetailField label="Unit / Tenant" value={<span className="text-sm font-semibold">Unit {detailTask.unitNumber} · {detailTask.tenantName}</span>} />
                <DetailField label="Created" value={
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold">{detailTask.createdAt}</span>
                    {(() => { const d = Math.floor((Date.now() - new Date(detailTask.createdAt).getTime()) / 86400000); return d > 7 && detailTask.status !== "Completed" ? <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[9px] font-black ml-1">{d}d old</Badge> : null; })()}
                  </div>
                } />
                <DetailField label="Tech Open Tasks" value={
                  <span className="text-sm font-semibold">{technicianStats[detailTask.technicianName] ?? 0} active</span>
                } />
              </div>
              {detailTask.notes && (
                <div className="rounded-xl bg-muted/40 p-4 border">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm leading-relaxed">{detailTask.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTask(null)}>Close</Button>
            <Button onClick={() => { setDetailTask(null); if (detailTask) openEdit(detailTask); }}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Status Dialog ── */}
      <Dialog open={!!statusTaskId} onOpenChange={(open) => { if (!open) setStatusTaskId(null); }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the current status of task {statusTaskId}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTaskId(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reassign Dialog ── */}
      <Dialog open={!!reassignTaskId} onOpenChange={(open) => { if (!open) setReassignTaskId(null); }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Reassign Technician</DialogTitle>
            <DialogDescription>Assign task {reassignTaskId} to a different technician.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Label>Technician</Label>
            <Select value={newTechnician} onValueChange={(v) => v && setNewTechnician(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TECHNICIANS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center justify-between gap-6">
                      <span>{t}</span>
                      <span className="text-xs text-muted-foreground">{technicianStats[t] ?? 0} open</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignTaskId(null)}>Cancel</Button>
            <Button onClick={handleReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog open={confirmComplete !== null} onOpenChange={(open) => { if (!open) setConfirmComplete(null); }}
        title="Mark as Completed"
        description={`Mark task ${confirmComplete} as completed? This will close the maintenance request.`}
        confirmLabel="Mark Complete" onConfirm={() => handleMarkComplete(confirmComplete!)} />
      <ConfirmDialog open={confirmCancel !== null} onOpenChange={(open) => { if (!open) setConfirmCancel(null); }}
        title="Cancel Request"
        description={`Cancel maintenance request ${confirmCancel}? The task will be removed from the active queue.`}
        confirmLabel="Cancel Request" variant="destructive" onConfirm={() => handleCancelTask(confirmCancel!)} />
      <ConfirmDialog open={bulkAction === "complete"} onOpenChange={(open) => { if (!open) setBulkAction(null); }}
        title="Complete Selected Tasks"
        description={`Mark ${selectedIds.size} selected task(s) as completed?`}
        confirmLabel="Complete All" onConfirm={handleBulkComplete} />
      <ConfirmDialog open={bulkAction === "cancel"} onOpenChange={(open) => { if (!open) setBulkAction(null); }}
        title="Cancel Selected Tasks"
        description={`Cancel and remove ${selectedIds.size} selected task(s)?`}
        confirmLabel="Cancel All" variant="destructive" onConfirm={handleBulkCancel} />

      {/* ── Main Table Card ── */}
      <Card className="border-none shadow-2xl shadow-foreground/5 overflow-hidden flex flex-col rounded-3xl">
        <CardHeader className="bg-muted/10 border-b pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Search by issue, property, tenant, or ID..."
                className="pl-11 bg-background border-muted rounded-2xl h-11 focus:ring-4 focus:ring-primary/5"
                value={searchInput} onChange={handleSearchChange} />
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={(v) => { if (v) { setFilterStatus(v); setCurrentPage(1); } }}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-muted text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(v) => { if (v) { setFilterPriority(v); setCurrentPage(1); } }}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-muted text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2"><PriorityDot priority={p} />{p}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={(v) => { if (v) { setFilterCategory(v); setCurrentPage(1); } }}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-muted text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="h-6 w-px bg-muted mx-1" />
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                {totalItems} recorded tasks
              </p>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Active filters:</span>
              {activeFilters.map((f) => (
                <button key={f.key} onClick={f.clear}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 hover:bg-primary/20 transition-colors">
                  {f.label}<X className="h-3 w-3" />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterCategory("all"); setCurrentPage(1); }}
                  className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2">
                  Clear all
                </button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="pl-6 w-10">
                    <button onClick={toggleSelectAll}
                      className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${allPageSelected ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}>
                      {allPageSelected && <div className="h-2 w-2 bg-white rounded-sm" />}
                    </button>
                  </TableHead>
                  <TableHead className="py-5 text-[10px] uppercase font-black tracking-widest">
                    <button className="flex items-center hover:text-primary transition-colors" onClick={() => handleSort("id")}>
                      Task ID & Issue<SortIcon field="id" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Location</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">
                    <button className="flex items-center hover:text-primary transition-colors" onClick={() => handleSort("priority")}>
                      Priority<SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Technician</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">
                    <button className="flex items-center hover:text-primary transition-colors" onClick={() => handleSort("status")}>
                      Status<SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">
                    <button className="flex items-center hover:text-primary transition-colors" onClick={() => handleSort("created")}>
                      Created<SortIcon field="created" sortField={sortField} sortDir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] uppercase font-black tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-30" />
                        <p className="font-bold text-sm">No tasks found</p>
                        <p className="text-xs">Try adjusting your search or filters.</p>
                        <Button variant="outline" size="sm" className="mt-1 rounded-xl text-xs" onClick={clearAllFilters}>
                          Clear all filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tasks.map((task) => {
                  const daysAgo = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000);
                  const isOverdue = daysAgo > 7 && task.status !== "Completed";
                  const isCritical = task.priority === "Critical";
                  const isSelected = selectedIds.has(String(task.id));
                  return (
                    <TableRow key={String(task.id)}
                      className={`group hover:bg-muted/30 transition-all border-muted/50 ${isCritical ? "border-l-2 border-l-red-400" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                      <TableCell className="pl-6">
                        <button onClick={() => toggleSelect(String(task.id))}
                          className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}>
                          {isSelected && <div className="h-2 w-2 bg-white rounded-sm" />}
                        </button>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-4">
                          <div className={`h-11 w-11 rounded-2xl bg-background border shadow-sm flex items-center justify-center shrink-0 ring-1 ring-black/[0.02] ${isCritical ? "border-red-200" : ""}`}>
                            {getCategoryIcon(task.category)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-foreground leading-tight">{task.title}</p>
                              {isOverdue && <Flame className="h-3.5 w-3.5 text-red-500 animate-pulse" aria-label={`${daysAgo} days old`} />}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{task.id} • {task.category}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-foreground">{task.propertyName}</p>
                            <p className="text-[10px] text-muted-foreground">Unit {task.unitNumber} • {task.tenantName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <TechnicianCell technician={task.technicianName} openTasks={technicianStats[task.technicianName] ?? 0} />
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">{task.createdAt}</p>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                            title="Mark complete" onClick={() => setConfirmComplete(String(task.id))}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="More actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1.5 rounded-xl shadow-xl" align="end">
                              <PopoverMenuItem icon={<Eye className="h-4 w-4" />} label="View Details" onClick={() => setDetailTask(task)} />
                              <PopoverMenuItem icon={<Edit2 className="h-4 w-4" />} label="Edit Task" onClick={() => openEdit(task)} />
                              <PopoverMenuItem icon={<RefreshCw className="h-4 w-4" />} label="Update Status" onClick={() => openStatusUpdate(task)} />
                              <PopoverMenuItem icon={<UserCog className="h-4 w-4" />} label="Reassign" onClick={() => openReassign(task)} />
                              <div className="my-1 h-px bg-muted" />
                              <PopoverMenuItem icon={<XCircle className="h-4 w-4" />} label="Cancel Request" onClick={() => setConfirmCancel(String(task.id))} destructive />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-muted/50">
            {tasks.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p className="font-bold text-sm">No tasks found</p>
                <Button variant="outline" size="sm" className="mt-1 rounded-xl text-xs" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : tasks.map((task) => {
              const daysAgo = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000);
              const isOverdue = daysAgo > 7 && task.status !== "Completed";
              const isCritical = task.priority === "Critical";
              const isSelected = selectedIds.has(String(task.id));
              return (
                <div key={String(task.id)}
                  className={`p-4 flex items-start gap-3 ${isCritical ? "border-l-2 border-l-red-400" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                  <button onClick={() => toggleSelect(String(task.id))}
                    className={`mt-1 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}>
                    {isSelected && <div className="h-2 w-2 bg-white rounded-sm" />}
                  </button>
                  <div className="h-10 w-10 rounded-xl bg-background border shadow-sm flex items-center justify-center shrink-0">
                    {getCategoryIcon(task.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-black text-sm truncate">{task.title}</p>
                        {isOverdue && <Flame className="h-3.5 w-3.5 text-red-500 shrink-0 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() => setConfirmComplete(String(task.id))}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1.5 rounded-xl shadow-xl" align="end">
                            <PopoverMenuItem icon={<Eye className="h-4 w-4" />} label="View Details" onClick={() => setDetailTask(task)} />
                            <PopoverMenuItem icon={<Edit2 className="h-4 w-4" />} label="Edit Task" onClick={() => openEdit(task)} />
                            <PopoverMenuItem icon={<RefreshCw className="h-4 w-4" />} label="Update Status" onClick={() => openStatusUpdate(task)} />
                            <PopoverMenuItem icon={<UserCog className="h-4 w-4" />} label="Reassign" onClick={() => openReassign(task)} />
                            <div className="my-1 h-px bg-muted" />
                            <PopoverMenuItem icon={<XCircle className="h-4 w-4" />} label="Cancel Request" onClick={() => setConfirmCancel(String(task.id))} destructive />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground">{String(task.id)} • {task.category}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{task.propertyName} · Unit {task.unitNumber}</span>
                      <span>{task.createdAt}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* ── Pagination ── */}
        <div className="p-5 bg-muted/10 border-t flex flex-wrap items-center justify-between gap-4 mt-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground font-bold italic">
              Displaying{" "}
              <span className="text-foreground not-italic">{startIndex + 1}</span>–
              <span className="text-foreground not-italic">{endIndex}</span> of{" "}
              <span className="text-foreground not-italic">{totalItems}</span> records
            </p>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => v && handlePageSizeChange(v)}>
                <SelectTrigger className="h-8 w-[70px] bg-background text-[10px] rounded-lg border-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["5", "10", "25"].map((v) => <SelectItem key={v} value={v} className="text-[10px]">{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-muted"
              onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-muted"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-1">
              <input type="number" min={1} max={totalPages || 1} value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)} onKeyDown={handleJump}
                placeholder={String(currentPage)}
                className="w-12 h-9 rounded-xl bg-background border border-muted text-center text-[11px] font-black tracking-tighter focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="text-[10px] font-black text-muted-foreground opacity-50">OF</span>
              <span className="text-[11px] font-black">{totalPages || 1}</span>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-muted"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-muted"
              onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-foreground text-background px-5 py-3 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground">
                {selectedIds.size}
              </div>
              <span className="text-sm font-bold">{selectedIds.size} selected</span>
            </div>
            <div className="h-5 w-px bg-background/20" />
            <button className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={() => setBulkAction("complete")}>
              <CheckCircle2 className="h-4 w-4" />Complete
            </button>
            <button className="flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
              onClick={() => setBulkAction("cancel")}>
              <Trash2 className="h-4 w-4" />Cancel
            </button>
            <div className="h-5 w-px bg-background/20" />
            <button className="text-sm text-background/60 hover:text-background transition-colors" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type TrendInfo = { dir: "up" | "down" | "flat"; pct: string; label: string; good?: boolean };

function MaintenanceStatCard({ label, value, icon, subtext, trend, pulse }: {
  label: string; value: string; icon: React.ReactNode; subtext: string; trend?: TrendInfo; pulse?: boolean;
}) {
  const trendColor = !trend ? "" :
    ((trend.dir === "up" && trend.good) || (trend.dir === "down" && trend.good)) ? "text-emerald-600" :
    ((trend.dir === "up" && !trend.good) || (trend.dir === "down" && !trend.good)) ? "text-red-500" : "text-muted-foreground";
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all rounded-2xl group">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{label}</p>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-bold ${trendColor}`}>
              {trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : trend.dir === "down" ? <TrendingDown className="h-3 w-3" /> : null}
              <span>{trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : ""}{trend.pct} {trend.label}</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-bold opacity-70 italic">{subtext}</p>
        </div>
        <div className={`h-14 w-14 rounded-2xl bg-background border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ring-1 ring-black/[0.02] ${pulse ? "ring-2 ring-red-300 animate-pulse" : ""}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function PopoverMenuItem({ icon, label, onClick, destructive }: {
  icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"}`}
      onClick={onClick}>
      {icon}{label}
    </button>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">{label}</p>
      <div>{value}</div>
    </div>
  );
}

function TechnicianCell({ technician, openTasks }: { technician: string; openTasks: number }) {
  const [open, setOpen] = useState(false);
  const initials = technician.split(" ").map((n) => n[0]).join("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/60 transition-colors"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}>
          <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-black text-primary border border-primary/10">
            {initials}
          </div>
          <p className="text-xs font-bold">{technician}</p>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-3 rounded-xl shadow-xl text-xs" align="start" sideOffset={4}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <p className="font-black text-sm mb-2">{technician}</p>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Open tasks</span>
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px]">{openTasks}</Badge>
        </div>
      </PopoverContent>
    </Popover>
  );
}
