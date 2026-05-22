import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { formatNPR } from "@/lib/currency";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Building2, Home, MapPin, Plus, Search,
  Users, Wallet, MoreVertical,
  ArrowUpRight, ChevronLeft, ChevronRight,
  Filter, Trash2, Eye, TrendingUp, TrendingDown,
  LayoutGrid, List, Loader2
} from "lucide-react";
import {
  getPropertiesApi,
  createPropertyApi,
  deletePropertyApi,
  type PropertyDto,
} from "@/lib/api/properties";

const PAGE_SIZE = 8;

export default function Properties() {
  const navigate = useNavigate();
  usePageTitle("Properties");

  const [items, setItems] = useState<PropertyDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formAddress, setFormAddress] = useState("");
  const [formName, setFormName] = useState("");
    // Auto-generate property name from address
    useEffect(() => {
      if (!formAddress.trim()) {
        setFormName("");
        return;
      }
      const parts = formAddress.split(",").map(p => p.trim()).filter(Boolean);
      let name = "";
      if (parts.length === 1) {
        name = `${capitalize(parts[0])} Property`;
      } else {
        name = `${capitalize(parts[0])} Property ${capitalize(parts[parts.length - 1])}`;
      }
      setFormName(name);
    }, [formAddress]);

    function capitalize(str: string) {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
  const [formType, setFormType] = useState("Building");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchProperties = useCallback(async (page: number, search: string, status: string) => {
    setIsLoading(true);
    try {
      const res = await getPropertiesApi({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(res.items);
      setTotalItems(res.totalItems);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast.error("Failed to load properties.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(currentPage, searchTerm, filterStatus);
  }, [fetchProperties, currentPage, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const totalUnits = items.reduce((s, p) => s + p.units, 0);
    const totalOccupied = items.reduce((s, p) => s + p.occupied, 0);
    const occupancy = totalUnits > 0 ? ((totalOccupied / totalUnits) * 100).toFixed(1) + "%" : "0%";
    return { totalUnits, occupancy };
  }, [items]);

  const handleSearchChange = (val: string) => { setSearchTerm(val); setCurrentPage(1); };
  const handleStatusChange = (val: string | null) => { if (val != null) { setFilterStatus(val); setCurrentPage(1); } };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Property name is required.";
    if (!formAddress.trim()) errors.address = "Address is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddProperty = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // API requires totalUnits, so send 1 as a placeholder
      const created = await createPropertyApi({
        name: formName.trim(),
        address: formAddress.trim(),
        type: formType,
        totalUnits: 1,
      });
      toast.success("Property added successfully!", { description: `${created.name} has been added to your portfolio.` });
      setIsAddOpen(false);
      setFormName(""); setFormAddress(""); setFormType("Building"); setFormErrors({});
      setCurrentPage(1);
      fetchProperties(1, searchTerm, filterStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add property.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (id: number) => {
    const prop = items.find(p => p.id === id);
    try {
      await deletePropertyApi(id);
      toast.success("Property deleted", { description: `${prop?.name} has been removed from your portfolio.` });
      fetchProperties(currentPage, searchTerm, filterStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete property.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-2 py-0.5 font-bold uppercase text-[9px] tracking-widest">Active</Badge>;
      case "Under Maintenance":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-2 py-0.5 font-bold uppercase text-[9px] tracking-widest">In Maintenance</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const SkeletonRow = () => (
    <TableRow className="border-muted/40">
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i} className={i === 0 ? "pl-6 py-4" : ""}>
          <div className="h-4 w-full max-w-[120px] rounded-lg bg-muted/40 animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );

  const SkeletonCard = () => (
    <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
      <div className="h-48 bg-muted/40 animate-pulse" />
      <CardContent className="p-5 space-y-3">
        <div className="h-4 w-2/3 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-3 w-1/2 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-9 w-full rounded-xl bg-muted/40 animate-pulse mt-4" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Property Inventory</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium text-italic">
            Monitoring {totalItems} assets across your real estate portfolio.
          </p>
        </div>
        <Button className="gap-2 shadow-xl shadow-primary/20 rounded-2xl h-11 font-bold px-6" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-5 w-5" />
          Register Property
        </Button>
      </div>

      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setFormErrors({}); }}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Add New Property</DialogTitle>
            <DialogDescription className="font-medium">Enter the details of the new property to add it to your portfolio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="propAddress" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mr-auto">Address</Label>
              <Input id="propAddress" placeholder="e.g. Lazimpat, Kathmandu" className="rounded-xl h-12" value={formAddress} onChange={e => setFormAddress(e.target.value)} aria-invalid={!!formErrors.address} />
              {formErrors.address && <p className="text-xs text-destructive font-medium pl-1">{formErrors.address}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="propName" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mr-auto">Property Name</Label>
              <Input id="propName" placeholder="e.g. Sunrise Heights" className="rounded-xl h-12" value={formName} onChange={e => setFormName(e.target.value)} aria-invalid={!!formErrors.name} />
              {formErrors.name && <p className="text-xs text-destructive font-medium pl-1">{formErrors.name}</p>}
            </div>
              <div className="grid gap-2">
                <Label htmlFor="propType" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mr-auto">Property Type</Label>
                <Select value={formType} onValueChange={(v) => v != null && setFormType(v)}>
                  <SelectTrigger id="propType" className="rounded-xl h-12 border-2 border-primary focus:ring-2 focus:ring-primary/30 focus:border-primary font-bold text-base">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-2 border-primary">
                    <SelectItem value="Land" className="font-semibold text-lg py-3">Land</SelectItem>
                    <SelectItem value="Building" className="font-semibold text-lg py-3">Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => { setIsAddOpen(false); setFormErrors({}); }} disabled={isSubmitting}>Cancel</Button>
            <Button className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20" onClick={handleAddProperty} disabled={isSubmitting}>
              {isSubmitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Adding…</span> : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Property"
        description={`Are you sure you want to delete "${items.find(p => p.id === deleteTarget)?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget !== null && handleDeleteProperty(deleteTarget)}
      />

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard label="Total Properties" value={isLoading ? "—" : totalItems.toString()} trend="+2" trendUp={true} icon={<Building2 className="h-5 w-5 text-primary" />} />
        <StatCard label="Total Units" value={isLoading ? "—" : stats.totalUnits.toString()} trend="+12" trendUp={true} icon={<Home className="h-5 w-5 text-emerald-500" />} />
        <StatCard label="Occupancy" value={isLoading ? "—" : stats.occupancy} trend="+2.1%" trendUp={true} icon={<Users className="h-5 w-5 text-blue-500" />} />
        <StatCard label="Avg. ROI" value="12.4%" trend="+0.5%" trendUp={true} icon={<Wallet className="h-5 w-5 text-amber-500" />} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/20 p-4 rounded-3xl border">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name or city..."
              className="pl-10 bg-background border-muted rounded-2xl h-10 group-hover:border-primary/30 transition-all font-medium focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className={cn("rounded-xl h-10 w-10 transition-all", viewMode === "list" && "bg-background shadow-sm border-primary/20 text-primary")} onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className={cn("rounded-xl h-10 w-10 transition-all", viewMode === "grid" && "bg-background shadow-sm border-primary/20 text-primary")} onClick={() => setViewMode("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <div className="h-6 w-px bg-muted mx-1" />
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest outline-none focus:ring-0">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active Only</SelectItem>
                <SelectItem value="Under Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {viewMode === "list" ? (
          <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden flex flex-col rounded-3xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="pl-6 py-5 font-black uppercase text-[10px] tracking-widest">Property Detail</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Type</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Occupancy</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Income Forecast</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Growth</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Current Status</TableHead>
                      <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : items.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-20 text-center text-muted-foreground font-medium">
                              No properties found. Register your first property above.
                            </TableCell>
                          </TableRow>
                        )
                        : items.map((property) => (
                          <TableRow key={property.id} className="group hover:bg-muted/[0.04] transition-colors border-muted/40">
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-sm border bg-muted/30 group-hover:scale-105 transition-transform flex items-center justify-center">
                                  {property.image
                                    ? <img src={property.image} className="h-full w-full object-cover" alt="" />
                                    : <Building2 className="h-5 w-5 text-muted-foreground" />
                                  }
                                </div>
                                <div>
                                  <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{property.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 text-red-500/70" /> {property.address}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                                {property.type}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5 w-32">
                                <div className="flex items-center justify-between text-[10px] font-black tracking-tighter">
                                  <span>{property.occupied} / {property.units} UNITS</span>
                                  <span className="text-primary">
                                    {property.units > 0 ? Math.round((property.occupied / property.units) * 100) : 0}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.3)] transition-all duration-1000"
                                    style={{ width: `${property.units > 0 ? (property.occupied / property.units) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-black text-sm text-foreground">{formatNPR(property.income)}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Estimated</p>
                            </TableCell>
                            <TableCell>
                              {property.valuation ? (
                                <div className={cn(
                                  "flex items-center gap-1 font-black text-xs",
                                  property.valuation.startsWith("+") ? "text-emerald-500" : "text-red-500"
                                )}>
                                  {property.valuation.startsWith("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {property.valuation}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(property.status)}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1.5 rounded-2xl" align="end">
                                  <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs font-bold rounded-xl" onClick={() => navigate(`/properties/${property.id}`)}>
                                    <Eye className="h-4 w-4" /> View Details
                                  </Button>
                                  <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs font-bold rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(property.id)}>
                                    <Trash2 className="h-4 w-4" /> Terminate
                                  </Button>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        ))
                    }
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : items.length === 0
                ? (
                  <div className="col-span-full py-20 text-center text-muted-foreground font-medium">
                    No properties found. Register your first property above.
                  </div>
                )
                : items.map((property) => (
                  <Card key={property.id} className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden group hover:-translate-y-2 transition-all duration-300">
                    <div className="relative h-48 overflow-hidden bg-muted/30 flex items-center justify-center">
                      {property.image
                        ? <img src={property.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        : <Building2 className="h-12 w-12 text-muted-foreground/30" />
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-4 right-4">{getStatusBadge(property.status)}</div>
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="font-black text-lg leading-tight truncate">{property.name}</p>
                        <p className="text-[10px] flex items-center gap-1 opacity-80 mt-1 uppercase font-bold tracking-widest">
                          <MapPin className="h-3 w-3" /> {property.address}
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Occupancy</p>
                          <p className="text-sm font-black">{property.occupied} / {property.units} Units</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Revenue</p>
                          <p className="text-sm font-black text-emerald-600">{formatNPR(property.income)}</p>
                        </div>
                      </div>
                      <Button className="w-full rounded-xl font-bold gap-2 shadow-lg shadow-primary/10" variant="secondary" onClick={() => navigate(`/properties/${property.id}`)}>
                        Browse Asset <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
            }
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between py-4 bg-muted/10 px-6 rounded-3xl border border-dashed border-muted">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Page {currentPage} of {totalPages} &mdash; Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalItems)}&ndash;{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("h-1.5 rounded-full transition-all", currentPage === i + 1 ? "bg-primary w-4" : "bg-muted w-1.5")} />
                ))}
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, trendUp, icon }: { label: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all rounded-3xl group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3 text-start">
          <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg", trendUp ? "bg-emerald-500/10 text-emerald-600 uppercase" : "bg-red-500/10 text-red-600 uppercase")}>
            {trend}
          </span>
        </div>
        <div className="text-start">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
