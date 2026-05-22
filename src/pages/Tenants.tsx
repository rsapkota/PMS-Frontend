import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { 
  Search, UserPlus, Mail, Phone, MoreVertical, 
  MapPin, CheckCircle2, AlertCircle, Clock,
  Filter, ChevronRight, User,
  ChevronLeft, Trash2, ArrowUpRight
} from "lucide-react";
import { getTenantsApi, createTenantApi, deleteTenantApi } from "@/lib/api/tenants";
import type { TenantDto } from "@/lib/api/tenants";

export default function Tenants() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [filterPayment, setFilterPayment] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<TenantDto | null>(null);
  usePageTitle("Tenants");

  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Controlled form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTenants = useCallback(async (page: number, size: number, search: string, payment: string) => {
    try {
      const result = await getTenantsApi({
        Page: page,
        PageSize: size,
        Search: search || undefined,
        PaymentStatus: payment !== "all" ? payment : undefined,
      });
      setTenants(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
    } catch {
      toast.error("Failed to load tenants");
    }
  }, []);

  useEffect(() => {
    loadTenants(currentPage, pageSize, searchTerm, filterPayment);
  }, [loadTenants, currentPage, pageSize, searchTerm, filterPayment]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 400);
  };

  const handleFilterChange = (v: string) => {
    setFilterPayment(v);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (v: string) => {
    setPageSize(Number(v));
    setCurrentPage(1);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "On-time":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">On-time</Badge>;
      case "Overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Full name is required.";
    if (!formEmail.trim()) errors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formEmail)) errors.email = "Enter a valid email address.";
    if (!formPhone.trim()) errors.phone = "Phone number is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTenant = async () => {
    if (!validateForm()) return;
    try {
      await createTenantApi({ fullName: formName, email: formEmail, phone: formPhone });
      setIsAddTenantOpen(false);
      setFormName(""); setFormEmail(""); setFormPhone(""); setFormErrors({});
      toast.success("Tenant profile saved!", { description: `${formName} has been added to the directory.` });
      loadTenants(1, pageSize, searchTerm, filterPayment);
      setCurrentPage(1);
    } catch {
      toast.error("Failed to save tenant");
    }
  };

  const handleDeleteTenant = async (tenant: TenantDto) => {
    try {
      await deleteTenantApi(String(tenant.id));
      toast.success("Tenant removed", { description: `${tenant.fullName}'s profile has been removed.` });
      loadTenants(currentPage, pageSize, searchTerm, filterPayment);
    } catch {
      toast.error("Failed to remove tenant");
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + tenants.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tenants Directory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage resident information, contact details, and payment standings.</p>
        </div>
        
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsAddTenantOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add New Tenant
        </Button>
        <Dialog open={isAddTenantOpen} onOpenChange={(open) => { setIsAddTenantOpen(open); if (!open) setFormErrors({}); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>
                Enter the basic contact information for a new tenant. You can assign them to a unit later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Legal Full Name</Label>
                <Input id="name" placeholder="e.g. Robert Smith" value={formName} onChange={e => { setFormName(e.target.value); setFormErrors(prev => ({ ...prev, name: "" })); }} aria-invalid={!!formErrors.name} />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="robert@example.com" value={formEmail} onChange={e => { setFormEmail(e.target.value); setFormErrors(prev => ({ ...prev, email: "" })); }} aria-invalid={!!formErrors.email} />
                  {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+977 98XXXXXXXX" value={formPhone} onChange={e => { setFormPhone(e.target.value); setFormErrors(prev => ({ ...prev, phone: "" })); }} aria-invalid={!!formErrors.phone} />
                  {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddTenantOpen(false); setFormErrors({}); }}>Cancel</Button>
              <Button onClick={handleSaveTenant}>Save Tenant Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard label="Active Tenants" value={totalItems.toString()} icon={<User className="h-4 w-4 text-primary" />} />
        <StatCard label="On-time Rate" value="94%" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Overdue Notices" value="1" icon={<AlertCircle className="h-4 w-4 text-red-500" />} />
        <StatCard label="Move-ins (30d)" value="12" icon={<Clock className="h-4 w-4 text-blue-500" />} />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remove Tenant"
        description={`Are you sure you want to remove "${deleteTarget?.fullName}" from the directory? This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={() => deleteTarget !== null && handleDeleteTenant(deleteTarget)}
      />

      {/* Table Card */}
      <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, property, or email..." 
                className="pl-9 bg-background border-muted" 
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={filterPayment} onValueChange={(v) => { if (v != null) handleFilterChange(v); }}>
              <SelectTrigger className="gap-1.5 h-9 w-[140px]">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                <SelectItem value="On-time">On-time</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="pl-6">Tenant Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Current Unit</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => {
                const displayName = t.fullName?.trim() || "Unknown Tenant";
                const initials = displayName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
                return (
                <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                        {initials || "U"}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{displayName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">TEN-{t.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{t.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{t.phone || "N/A"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.propertyName || "Unassigned"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Unit {t.unitNumber || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(t.paymentStatus)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="View tenant" onClick={() => navigate(`/tenants/${t.id}`)}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1.5 rounded-xl shadow-xl" align="end">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
              );})}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-10 w-10 opacity-10" />
                      <p>No tenants match your current search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {/* Pagination Footer */}
        <div className="p-4 bg-muted/10 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{startIndex + 1}</span> to <span className="text-foreground">{endIndex}</span> of <span className="text-foreground">{totalItems}</span> tenants
            </p>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { if (v != null) handlePageSizeChange(v); }}>
                <SelectTrigger className="h-8 w-[70px] bg-background text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5" className="text-[10px]">5</SelectItem>
                  <SelectItem value="10" className="text-[10px]">10</SelectItem>
                  <SelectItem value="20" className="text-[10px]">20</SelectItem>
                  <SelectItem value="50" className="text-[10px]">50</SelectItem>
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

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-1 tracking-tight">{value}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
