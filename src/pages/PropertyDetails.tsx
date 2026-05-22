import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, MapPin, Plus, Mail, Phone,
  MoreVertical, Wallet, Users, LayoutDashboard, List,
  Settings, FileText, TrendingUp, Clock, Home,
  Calendar, Download, Search, ChevronLeft, ChevronRight
} from "lucide-react";
import { formatNPR } from "@/lib/currency";
import {
  getPropertySummaryApi,
  getPropertyActivityApi,
  getPropertyTransactionsApi,
  getPropertyUnitsApi,
  createUnitApi,
} from "@/lib/api/propertyDetails";
import type { PropertySummaryDto, ActivityDto, TransactionDto, UnitDto } from "@/lib/api/propertyDetails";

const RESIDENTIAL_UNIT_TYPES = [
  "1BK",
  "1BHK",
  "2BK",
  "2BHK",
  "3BHK",
  "4BHK",
  "Studio",
  "Single Room",
  "2 Room",
  "3 Room",
  "4+ Room",
  "Custom",
] as const;

const COMMERCIAL_UNIT_TYPES = [
  "Shop",
  "Office",
  "Shutter",
  "Warehouse",
  "Hall",
  "Mixed-use",
  "Custom",
] as const;

function normalizeUnitType(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact
    .split(" ")
    .map((part) => {
      const upper = part.toUpperCase();
      if (upper === "BHK" || upper === "BK") return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activityIcon(type: ActivityDto["type"]) {
  switch (type) {
    case "Payment": return <Wallet className="h-4 w-4 text-emerald-500" />;
    case "Maintenance": return <Settings className="h-4 w-4 text-orange-500" />;
    case "Lease": return <FileText className="h-4 w-4 text-blue-500" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const propertyId = Number(id);

  const [summary, setSummary] = useState<PropertySummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<"not_found" | "error" | null>(null);

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [unitFormNumber, setUnitFormNumber] = useState("");
  const [unitFormCategory, setUnitFormCategory] = useState<"Residential" | "Commercial">("Residential");
  const [unitFormTypePreset, setUnitFormTypePreset] = useState<string>("1BHK");
  const [unitFormCustomType, setUnitFormCustomType] = useState("");
  const [unitFormFloor, setUnitFormFloor] = useState("");
  const [unitFormNumberTouched, setUnitFormNumberTouched] = useState(false);
  const [unitFormAreaSqft, setUnitFormAreaSqft] = useState("");
  const [unitFormError, setUnitFormError] = useState("");
  const [unitFormSubmitting, setUnitFormSubmitting] = useState(false);
  const [unitsRefreshKey, setUnitsRefreshKey] = useState(0);

  usePageTitle("Property Details");

  const isUnitsView = location.pathname.endsWith("/units");
  const view = isUnitsView ? "units" : "overview";

  const loadSummary = useCallback(() => {
    if (!propertyId) return;
    setSummaryError(null);
    getPropertySummaryApi(propertyId)
      .then(setSummary)
      .catch((err: Error) => setSummaryError(err.message === "NOT_FOUND" ? "not_found" : "error"))
      .finally(() => setSummaryLoading(false));
  }, [propertyId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  function toTypeCode(value: string): string {
    const parts = value
      .trim()
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean);
    if (parts.length === 0) return "UNIT";
    if (parts.length === 1) return parts[0].toUpperCase();
    return parts.map((p) => p[0].toUpperCase()).join("");
  }

  function buildAutoUnitNumber(category: "Residential" | "Commercial", typeLabel: string, floor: string): string {
    const categoryCode = category === "Residential" ? "R" : "C";
    const floorCode = floor.trim().replace(/\s+/g, "").toUpperCase();
    if (!floorCode) return "";
    return `${categoryCode}-${toTypeCode(typeLabel)}-${floorCode}`;
  }

  const selectedType = unitFormTypePreset === "Custom"
    ? normalizeUnitType(unitFormCustomType)
    : normalizeUnitType(unitFormTypePreset);

  useEffect(() => {
    if (unitFormNumberTouched) return;
    setUnitFormNumber(buildAutoUnitNumber(unitFormCategory, selectedType, unitFormFloor));
  }, [unitFormCategory, selectedType, unitFormFloor, unitFormNumberTouched]);

  function resetForm() {
    setUnitFormNumber("");
    setUnitFormCategory("Residential");
    setUnitFormTypePreset("1BHK");
    setUnitFormCustomType("");
    setUnitFormFloor("");
    setUnitFormNumberTouched(false);
    setUnitFormAreaSqft("");
    setUnitFormError("");
  }

  async function handleAddUnit() {
    if (!unitFormFloor.trim()) { setUnitFormError("Floor is required."); return; }
    if (!selectedType) { setUnitFormError("Unit type is required."); return; }
    if (!unitFormNumber.trim()) { setUnitFormError("Unit number is required."); return; }
    if (unitFormAreaSqft && isNaN(Number(unitFormAreaSqft))) { setUnitFormError("Area must be a valid number."); return; }

    setUnitFormSubmitting(true);
    try {
      const unitNumber = unitFormNumber.trim();
      const createdUnit = await createUnitApi(propertyId, {
        number: unitFormNumber.trim(),
        type: selectedType,
        // UI hides rent for now; keep API contract with a default value.
        rentAmount: 0,
        floor: unitFormFloor.trim(),
        areaSqft: unitFormAreaSqft ? Number(unitFormAreaSqft) : 0,
      });
      setIsAddUnitOpen(false);
      resetForm();
      setUnitsRefreshKey(k => k + 1);
      getPropertySummaryApi(propertyId).then(setSummary).catch(() => {});
      toast.success("Unit added successfully!", { description: `Unit ${unitNumber} has been added.` });
      navigate(`/properties/${propertyId}/units/${createdUnit.id}`);
    } catch (err) {
      const msg = (err as Error).message || "Failed to add unit.";
      setUnitFormError(msg);
      toast.error("Could not add unit", { description: msg });
    } finally {
      setUnitFormSubmitting(false);
    }
  }

  if (summaryLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <div className="h-8 w-52 bg-muted animate-pulse rounded" />
            <div className="h-4 w-36 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-none shadow-sm bg-muted/20">
              <CardHeader className="pb-2"><div className="h-3 w-24 bg-muted animate-pulse rounded" /></CardHeader>
              <CardContent><div className="h-8 w-20 bg-muted animate-pulse rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (summaryError || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">
          {summaryError === "not_found" ? "Property not found" : "Failed to load property"}
        </h2>
        <Button onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{summary.name}</h1>
            <div className="flex items-center text-muted-foreground mt-1 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{summary.address}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl shadow-inner">
          <TabButton
            active={view === "overview"}
            onClick={() => navigate(`/properties/${id}/overview`)}
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Overview"
          />
          <TabButton
            active={view === "units"}
            onClick={() => navigate(`/properties/${id}/units`)}
            icon={<List className="h-4 w-4" />}
            label="Units Inventory"
          />
        </div>
      </div>

      <Dialog open={isAddUnitOpen} onOpenChange={(open) => { setIsAddUnitOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>Configure the details and amenities for this unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="unitCategory">Unit Category</Label>
              <Select
                value={unitFormCategory}
                onValueChange={(v) => {
                  if (v == null) return;
                  const nextCategory = v as "Residential" | "Commercial";
                  setUnitFormCategory(nextCategory);
                  setUnitFormTypePreset(nextCategory === "Residential" ? "1BHK" : "Shop");
                  setUnitFormCustomType("");
                  setUnitFormNumberTouched(false);
                  setUnitFormError("");
                }}
              >
                <SelectTrigger id="unitCategory"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitType">Unit Type</Label>
              <Select value={unitFormTypePreset} onValueChange={(v) => { if (v != null) { setUnitFormTypePreset(v); setUnitFormNumberTouched(false); setUnitFormError(""); } }}>
                <SelectTrigger id="unitType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(unitFormCategory === "Residential" ? RESIDENTIAL_UNIT_TYPES : COMMERCIAL_UNIT_TYPES).map((typeOption) => (
                    <SelectItem key={typeOption} value={typeOption}>{typeOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {unitFormTypePreset === "Custom" && (
              <div className="grid gap-2">
                <Label htmlFor="unitCustomType">Custom Unit Type</Label>
                <Input
                  id="unitCustomType"
                  placeholder="e.g. 2BHK + Study"
                  value={unitFormCustomType}
                  onChange={(e) => { setUnitFormCustomType(e.target.value); setUnitFormNumberTouched(false); setUnitFormError(""); }}
                  aria-invalid={!!unitFormError && !unitFormCustomType.trim()}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="unitFloor">Floor</Label>
              <Input id="unitFloor" placeholder="e.g. 1st or Ground" value={unitFormFloor} onChange={e => { setUnitFormFloor(e.target.value); setUnitFormNumberTouched(false); setUnitFormError(""); }} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitName">Unit Name / Number</Label>
              <Input id="unitName" placeholder="Auto-generated from category, type and floor" value={unitFormNumber} onChange={e => { setUnitFormNumber(e.target.value); setUnitFormNumberTouched(true); setUnitFormError(""); }} aria-invalid={!!unitFormError && !unitFormNumber.trim()} />
              <p className="text-xs text-muted-foreground">Generated as {`Category-Type-Floor`} and you can edit it.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitArea">Area (sqft) (Optional)</Label>
              <Input id="unitArea" type="number" min={0} placeholder="e.g. 550" value={unitFormAreaSqft} onChange={e => { setUnitFormAreaSqft(e.target.value); setUnitFormError(""); }} />
            </div>
            {unitFormError && <p className="text-xs text-destructive">{unitFormError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUnitOpen(false)} disabled={unitFormSubmitting}>Cancel</Button>
            <Button className="w-full" onClick={handleAddUnit} disabled={unitFormSubmitting}>
              {unitFormSubmitting ? "Adding..." : "Add Unit to Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {view === "overview" ? (
        <PropertyOverview summary={summary} onAddUnit={() => setIsAddUnitOpen(true)} />
      ) : (
        <PropertyUnits
          propertyId={propertyId}
          onAddUnit={() => setIsAddUnitOpen(true)}
          refreshKey={unitsRefreshKey}
          onNavigateUnit={(unitId) => navigate(`/properties/${id}/units/${unitId}`)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={`gap-2 transition-all px-4 h-9 ${active ? "bg-background shadow-sm font-bold text-primary" : "text-muted-foreground"}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

function PropertyOverview({ summary, onAddUnit }: { summary: PropertySummaryDto; onAddUnit: () => void }) {
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    getPropertyActivityApi(summary.id, 5)
      .then(setActivities)
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [summary.id]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Units" value={summary.totalUnits.toString()} icon={<Home className="h-4 w-4 text-primary" />} description="Capacity" />
        <StatCard title="Tenants" value={summary.activeTenants.toString()} icon={<Users className="h-4 w-4 text-blue-500" />} description="Active leases" />
        <StatCard title="Total Rent" value={formatNPR(summary.totalMonthlyRent)} icon={<Wallet className="h-4 w-4 text-emerald-500" />} description="Expected monthly" />
        <StatCard title="Collected" value={formatNPR(summary.collectedThisMonth)} icon={<TrendingUp className="h-4 w-4 text-orange-500" />} description="This month" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden">
            <CardHeader className="bg-muted/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Property Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activityLoading ? (
                <div className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-2.5 w-28 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Clock className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className="h-9 w-9 rounded-full bg-background border shadow-sm flex items-center justify-center shrink-0">
                          {activityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-none">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.amount != null && (
                          <p className="text-sm font-black text-emerald-600">+{formatNPR(activity.amount)}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">{relativeTime(activity.occurredAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <PropertyTransactions propertyId={summary.id} propertyName={summary.name} />
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-foreground/5">
            <CardHeader><CardTitle className="text-lg font-bold">Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="w-full justify-start gap-3 h-11 border-dashed hover:border-primary hover:bg-primary/5 transition-all" onClick={onAddUnit}>
                <Plus className="h-4 w-4" />
                Add New Unit
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={() => toast.info("Property Settings", { description: "Settings panel coming soon." })}>
                <Settings className="h-4 w-4" />
                Property Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 text-primary border-primary/20 hover:bg-primary/5"
                onClick={() => {
                  const csv = "Property,Address,Type,Units,Status\n" +
                    `${summary.name},${summary.address},${summary.type},${summary.totalUnits},${summary.status}`;
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `${summary.name}-report.csv`; a.click(); URL.revokeObjectURL(url);
                  toast.success("Report exported!", { description: `${summary.name} report has been downloaded.` });
                }}
              >
                <FileText className="h-4 w-4" />
                Export Building Report
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-foreground/5 bg-primary/5">
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Property Manager</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20">RF</div>
                <div>
                  <p className="font-bold">Robert Fox</p>
                  <p className="text-xs text-muted-foreground">Senior Manager</p>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="secondary" className="flex-1 gap-2 h-9 text-xs" onClick={() => toast.info("Compose Email", { description: "Email to robert.fox@meronest.com" })}><Mail className="h-3.5 w-3.5" /> Email</Button>
                <Button variant="secondary" className="flex-1 gap-2 h-9 text-xs" onClick={() => toast.info("Calling", { description: "Dialing +977 9841000001..." })}><Phone className="h-3.5 w-3.5" /> Call</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PropertyTransactions({ propertyId, propertyName: _propertyName }: { propertyId: number; propertyName: string }) {
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 8;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    setLoading(true);
    getPropertyTransactionsApi(propertyId, { page, pageSize, search: search || undefined })
      .then((data) => {
        setTransactions(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
      })
      .catch(() => toast.error("Failed to load transactions."))
      .finally(() => setLoading(false));
  }, [propertyId, page, search]);

  function exportCsv() {
    const header = "ID,Tenant,Unit,Amount,Date,Category,Status,Method";
    const rows = transactions.map(tx =>
      `${tx.id},${tx.tenantName},${tx.unitNumber},${tx.amount},${tx.date},${tx.category},${tx.status},${tx.method}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("Transactions exported.");
  }

  return (
    <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden">
      <CardHeader className="bg-muted/5 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-lg font-bold">Building Ledger</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search ledger..." className="pl-8 bg-background h-8 text-xs w-[180px]" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
            <Button variant="outline" className="gap-2 h-8 text-xs" onClick={exportCsv}><Download className="h-3.5 w-3.5" />Export</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/5">
            <TableRow>
              <TableHead className="pl-6 text-[10px] uppercase font-black">ID</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Source</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Date</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Amount</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
              <TableHead className="text-right pr-6 text-[10px] uppercase font-black">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><div className="h-3 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-28 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No transactions found.</TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-3 font-mono text-[9px] font-bold text-muted-foreground tracking-tighter">{tx.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <p className="font-bold text-xs">{tx.tenantName}</p>
                    <p className="text-[9px] text-muted-foreground">Unit {tx.unitNumber}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium"><Calendar className="h-3 w-3 text-muted-foreground" />{formatDate(tx.date)}</div>
                  </TableCell>
                  <TableCell><p className="font-black text-xs">{formatNPR(tx.amount)}</p></TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] py-0 px-1.5 ${tx.status === "Paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{tx.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="bg-muted/5 border-t p-3 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-medium">{totalItems} transactions</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-[10px] font-bold">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function PropertyUnits({
  propertyId, onAddUnit, refreshKey, onNavigateUnit,
}: {
  propertyId: number; onAddUnit: () => void; refreshKey: number; onNavigateUnit: (unitId: string) => void;
}) {
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 8;

  useEffect(() => {
    setLoading(true);
    getPropertyUnitsApi(propertyId, { page, pageSize })
      .then((data) => {
        setUnits(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
      })
      .catch(() => toast.error("Failed to load units."))
      .finally(() => setLoading(false));
  }, [propertyId, page, refreshKey]);

  return (
    <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
        <CardTitle className="text-xl font-bold">Units Inventory</CardTitle>
        <Button className="gap-2 shadow-lg shadow-primary/10" onClick={onAddUnit}><Plus className="h-4 w-4" />Add Unit</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/5">
            <TableRow>
              <TableHead className="pl-6">Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><div className="h-3 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-14 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-14 text-muted-foreground text-sm">
                  No units yet. Add your first unit to get started.
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6">
                    <Button variant="link" onClick={() => onNavigateUnit(unit.id)} className="p-0 h-auto font-bold text-primary">{unit.number}</Button>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold">{unit.type}</Badge></TableCell>
                  <TableCell className="text-xs font-medium text-muted-foreground">{unit.floor} - {unit.areaSqft != null ? `${unit.areaSqft} sqft` : "Area N/A"}</TableCell>
                  <TableCell>
                    <Badge className={
                      unit.status === "Occupied" ? "bg-blue-500/10 text-blue-600 border-none" :
                      unit.status === "Maintenance" ? "bg-amber-500/10 text-amber-600 border-none" :
                      "bg-emerald-500/10 text-emerald-600 border-none"
                    }>{unit.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold">{unit.tenantName || "Ready to Lease"}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="end">
                        <button
                          className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => onNavigateUnit(unit.id)}
                        >
                          View details
                        </button>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="bg-muted/5 border-t p-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{totalItems} units total</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs font-bold">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function StatCard({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description: string }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shadow-sm">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 font-bold">{description}</p>
      </CardContent>
    </Card>
  );
}
