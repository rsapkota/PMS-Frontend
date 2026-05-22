import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, Plus, Layers, Building2, 
  CheckCircle2, 
  Filter, ChevronRight, ChevronLeft,
  ArrowUpRight, MoreVertical, Settings2
} from "lucide-react";
import { formatNPR } from "@/lib/currency";
import { getUnitsApi, getUnitsSummaryApi } from "@/lib/api/units";
import type { UnitListItemDto, UnitSummaryDto } from "@/lib/api/units";

export default function Units() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  usePageTitle("Units");

  // Data state
  const [units, setUnits] = useState<UnitListItemDto[]>([]);
  const [summary, setSummary] = useState<UnitSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load summary once
  useEffect(() => {
    getUnitsSummaryApi().then(setSummary).catch(() => {});
  }, []);

  // Load paginated units when page/pageSize/search changes
  const loadUnits = useCallback(() => {
    setLoading(true);
    getUnitsApi({
      page: currentPage,
      pageSize,
      search: searchTerm || undefined,
    })
      .then((data) => {
        setUnits(data.items);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + units.length, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string | null) => {
    if (size == null) return;
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Occupied":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Occupied</Badge>;
      case "Vacant":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Vacant</Badge>;
      case "Maintenance":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">In Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Centralized oversight of all rental inventory across your portfolio.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          Add Global Unit
        </Button>
      </div>

      {/* Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Total Units" value={summary ? summary.totalUnits.toString() : "—"} icon={<Layers className="h-4 w-4 text-primary" />} />
        <StatCard label="Vacant Now" value={summary ? summary.vacantUnits.toString() : "—"} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Maintenance" value={summary ? summary.maintenanceUnits.toString() : "—"} icon={<Settings2 className="h-4 w-4 text-orange-500" />} />
      </div>

      {/* Main Inventory Card */}
      <Card className="border-none shadow-xl shadow-foreground/5 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by unit #, property, or type..." 
                className="pl-9 bg-background border-muted" 
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
              <div className="h-6 w-px bg-muted mx-1" />
              <p className="text-xs font-medium text-muted-foreground">
                Showing {units.length} of {totalItems} units
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="pl-6 py-4">Unit Detail</TableHead>
                <TableHead>Property Location</TableHead>
                <TableHead>Type & Specs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6 py-4"><div className="h-9 w-24 bg-muted animate-pulse rounded-lg" /></TableCell>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : (
                <>
                  {units.map((unit) => (
                <TableRow key={unit.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] uppercase tracking-tight text-primary font-bold overflow-hidden">
                        {(unit.number ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "UNT"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate max-w-[220px]" title={unit.number}>{unit.number}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate max-w-[220px]" title={unit.floor}>{unit.floor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{unit.propertyName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 h-4">
                        {unit.type}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground font-medium">{unit.areaSqft != null ? `${unit.areaSqft} sqft` : "Area N/A"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(unit.status)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/properties/${unit.propertyId}/units/${unit.id}`)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end">
                          <button
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => navigate(`/properties/${unit.propertyId}/units/${unit.id}`)}
                          >
                            View details
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
                  ))}
                  {units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Layers className="h-12 w-12" />
                      <p>No units found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="p-4 bg-muted/10 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{totalItems === 0 ? 0 : startIndex + 1}</span> to <span className="text-foreground">{endIndex}</span> of <span className="text-foreground">{totalItems}</span> units
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
                  <SelectItem value="25" className="text-[10px]">25</SelectItem>
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
              onClick={() => handlePageChange(currentPage - 1)}
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
              onClick={() => handlePageChange(currentPage + 1)}
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

function UnitStatCard({ label, value, icon, subtext }: { label: string, value: string, icon: React.ReactNode, subtext: string }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
          <p className="text-3xl font-black mt-1 tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{subtext}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
