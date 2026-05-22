import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { 
  Search, Filter, FileText, ChevronRight, 
  Building2, Calendar, Wallet,
  CheckCircle2, MoreVertical,
  ArrowUpRight, Clock, ChevronLeft, Download, RefreshCcw, XCircle
} from "lucide-react";
import { getLeasesApi, renewLeaseApi, terminateLeaseApi } from "@/lib/api/leases";
import type { LeaseDto } from "@/lib/api/leases";
import { formatNPR } from "@/lib/currency";

export default function Leases() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ type: "renew" | "terminate"; lease: LeaseDto } | null>(null);
  usePageTitle("Leases");

  const [leases, setLeases] = useState<LeaseDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLeases = useCallback(async (page: number, size: number, search: string, status: string) => {
    try {
      const result = await getLeasesApi({
        Page: page, PageSize: size,
        Search: search || undefined,
        Status: status !== "all" ? status : undefined,
      });
      setLeases(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
    } catch {
      toast.error("Failed to load leases");
    }
  }, []);

  useEffect(() => {
    loadLeases(currentPage, pageSize, searchTerm, filterStatus);
  }, [loadLeases, currentPage, pageSize, searchTerm, filterStatus]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchTerm(value); setCurrentPage(1); }, 400);
  };

  const handlePageSizeChange = (v: string) => { setPageSize(Number(v)); setCurrentPage(1); };

  const handleExportCSV = () => {
    const headers = "Lease ID,Property,Unit,Tenant,Email,Start,End,Rent,Status";
    const rows = leases.map(l => `${l.id},${l.propertyName},${l.unitNumber},${l.tenantName},${l.tenantEmail},${l.leaseStart},${l.leaseEnd},${l.rentAmount},${l.status}`).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leases-export.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported!", { description: `${leases.length} lease records downloaded.` });
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + leases.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case "Expiring":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expiring Soon</Badge>;
      case "Closed":
        return <Badge variant="secondary" className="opacity-60">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lease Agreements</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all active and historical tenant leases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={(v) => { if (v != null) { setFilterStatus(v); setCurrentPage(1); } }}>    
            <SelectTrigger className="gap-1.5 h-9 w-[140px]">
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expiring">Expiring Soon</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <MiniStatCard label="Total Leases" value={String(totalItems)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <MiniStatCard label="Expiring (30d)" value="—" icon={<Clock className="h-4 w-4 text-amber-500" />} />
        <MiniStatCard label="Pending Signature" value="—" icon={<FileText className="h-4 w-4 text-blue-500" />} />
        <MiniStatCard label="Monthly Revenue" value="—" icon={<Wallet className="h-4 w-4 text-primary" />} />
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.type === "renew" ? "Renew Lease" : "Terminate Lease"}
        description={
          confirmAction?.type === "renew"
            ? `Renew the lease for ${confirmAction?.lease.tenant} in Unit ${confirmAction?.lease.unit}? A new 12-month term will be generated.`
            : `Terminate the lease for ${confirmAction?.lease.tenant} in Unit ${confirmAction?.lease.unit}? This will mark the lease as closed.`
        }
        confirmLabel={confirmAction?.type === "renew" ? "Renew" : "Terminate"}
        variant={confirmAction?.type === "terminate" ? "destructive" : "default"}
        onConfirm={() => {
          if (!confirmAction) return;
          const { type, lease } = confirmAction;
          if (type === "renew") {
            const newEnd = new Date();
            newEnd.setFullYear(newEnd.getFullYear() + 1);
            renewLeaseApi(String(lease.id), { newEndDate: newEnd.toISOString().split("T")[0] })
              .then(() => { toast.success("Lease renewed!", { description: `${lease.tenantName}'s lease renewed for 12 months.` }); loadLeases(currentPage, pageSize, searchTerm, filterStatus); })
              .catch(() => toast.error("Failed to renew lease"));
          } else {
            terminateLeaseApi(String(lease.id), { reason: "Manual termination", effectiveDate: new Date().toISOString().split("T")[0] })
              .then(() => { toast.success("Lease terminated", { description: `${lease.tenantName}'s lease has been terminated.` }); loadLeases(currentPage, pageSize, searchTerm, filterStatus); })
              .catch(() => toast.error("Failed to terminate lease"));
          }
        }}
      />

      {/* Main Table Card */}
      <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by tenant or property..." 
                className="pl-9 bg-background" 
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Showing {leases.length} of {totalItems} leases
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="w-[100px]">Lease ID</TableHead>
                <TableHead>Property & Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((lease) => (
                <TableRow key={lease.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-[10px] font-bold text-muted-foreground">
                    LSE-{lease.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{lease.propertyName}</p>
                        <p className="text-xs text-muted-foreground">Unit {lease.unitNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold uppercase">
                        {lease.tenantName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{lease.tenantName}</p>
                        <p className="text-[10px] text-muted-foreground">{lease.tenantEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{lease.leaseStart} - {lease.leaseEnd}</span>
                      </div>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-sm">{formatNPR(lease.rentAmount)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Monthly</p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(lease.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        title="View lease"
                        onClick={() => navigate(`/leases/${lease.id}`)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5 rounded-xl shadow-xl" align="end">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setConfirmAction({ type: "renew", lease })}
                          >
                            <RefreshCcw className="h-4 w-4 text-muted-foreground" /> Renew Lease
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setConfirmAction({ type: "terminate", lease })}
                          >
                            <XCircle className="h-4 w-4" /> Terminate
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No leases found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {/* Pagination Footer */}
        <div className="p-4 bg-muted/10 border-t flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{startIndex + 1}</span> to <span className="text-foreground">{endIndex}</span> of <span className="text-foreground">{totalItems}</span> leases
            </p>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
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

function MiniStatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
          <p className="text-2xl font-black mt-1 tracking-tight">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
