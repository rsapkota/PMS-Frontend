import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, User, Wallet,
  Calendar, CheckCircle2, Building2, Settings,
  UserPlus
} from "lucide-react";
import { formatNPR } from "@/lib/currency";
import { getUnitApi, type UnitDetailDto } from "@/lib/api/units";
import { getLeasesApi, type LeaseDto } from "@/lib/api/leases";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UnitDetails() {
  const params = useParams();
  const navigate = useNavigate();
  usePageTitle("Unit Details");
  
  const id = params.id;
  const unitId = params.unitId;
  const [unit, setUnit] = useState<UnitDetailDto | null>(null);
  const [activeLease, setActiveLease] = useState<LeaseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    getUnitApi(unitId)
      .then(setUnit)
      .catch((err: Error) => {
        setError(err.message === "NOT_FOUND" ? "Unit not found." : "Failed to load unit details.");
      })
      .finally(() => setLoading(false));
  }, [unitId]);

  useEffect(() => {
    if (!unit || unit.status !== "Occupied") {
      setActiveLease(null);
      return;
    }

    let cancelled = false;
    getLeasesApi({
      Page: 1,
      PageSize: 50,
      Search: unit.number,
      Status: "Active",
    })
      .then((result) => {
        if (cancelled) return;
        const found = result.items.find((lease) =>
          String(lease.unitId) === String(unit.id) || lease.unitNumber === unit.number
        ) ?? null;
        setActiveLease(found);
      })
      .catch(() => {
        if (!cancelled) setActiveLease(null);
      });

    return () => {
      cancelled = true;
    };
  }, [unit]);

  const isOccupied = unit?.status === "Occupied";
  const features = useMemo(() => unit?.features ?? [], [unit]);
  const displayRentAmount = activeLease?.rentAmount ?? unit?.rentAmount ?? null;
  const displayLeaseStart = activeLease?.leaseStart ?? unit?.leaseStart ?? null;
  const displayLeaseEnd = activeLease?.leaseEnd ?? unit?.leaseEnd ?? null;
  const displaySecurityDeposit = activeLease?.securityDeposit ?? unit?.securityDeposit ?? null;

  const handleAddTenant = () => {
    navigate(`/properties/${id}/units/${unitId}/onboard`);
  };

  if (!id || !unitId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Missing Unit Information</h1>
        <Button className="mt-4" onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${id}/units`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <div className="h-7 w-44 bg-muted animate-pulse rounded" />
            <div className="h-4 w-56 bg-muted animate-pulse rounded" />
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

  if (error || !unit) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">{error ?? "Failed to load unit."}</h1>
        <Button className="mt-4" onClick={() => navigate(`/properties/${id}/units`)}>Back to Units</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${id}/units`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Unit {unit.number}</h1>
              <Badge 
                className={
                  unit.status === "Occupied" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  unit.status === "Maintenance" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }
              >
                {unit.status}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3" /> {unit.propertyName} • {unit.floor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/properties/${id}/units/${unitId}/meters`)}
          >
            <Settings className="h-4 w-4" />
            Manage Utility Meters
          </Button>
          {!isOccupied && (
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleAddTenant}>
              <UserPlus className="h-4 w-4" />
              Add Tenant
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Monthly Rent" 
          value={displayRentAmount != null ? formatNPR(displayRentAmount) : "-"} 
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
          description={isOccupied ? "Current lease rate" : "Set when occupied"}
        />
        <StatCard 
          title="Lease End" 
          value={formatDate(displayLeaseEnd)} 
          icon={<Calendar className="h-4 w-4 text-blue-500" />}
          description={isOccupied ? "Active lease" : "No active lease"}
        />
        <StatCard 
          title="Security Deposit" 
          value={displaySecurityDeposit != null ? formatNPR(displaySecurityDeposit) : "-"} 
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
          description={displaySecurityDeposit != null ? "Registered" : "Not recorded"}
        />
        <StatCard 
          title="Area" 
          value={unit.areaSqft != null ? `${unit.areaSqft} sqft` : "-"} 
          icon={<Settings className="h-4 w-4 text-emerald-500" />}
          description="Unit footprint"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {unit.tenantName ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {unit.tenantName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{unit.tenantName}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-600">
                        Active Lease
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Start: {formatDate(displayLeaseStart)}</span></div>
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><span>End: {formatDate(displayLeaseEnd)}</span></div>
                  </div>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">No Active Tenant</p>
                    <p className="text-xs text-muted-foreground mt-1">This unit is currently vacant and available for lease.</p>
                  </div>
                  <Button variant="outline" className="w-full gap-2 mt-2" onClick={handleAddTenant}>
                    <UserPlus className="h-4 w-4" />
                    Add Tenant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unit Features</CardTitle>
            </CardHeader>
            <CardContent>
              {features.length === 0 ? (
                <p className="text-sm text-muted-foreground">No features configured for this unit yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-[11px]">{feature}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Property" value={unit.propertyName} icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Unit Number" value={unit.number} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Unit Type" value={unit.type} icon={<Settings className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Floor" value={unit.floor} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Area" value={unit.areaSqft != null ? `${unit.areaSqft} sqft` : "-"} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Status" value={unit.status} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Tenant" value={unit.tenantName ?? "Vacant"} icon={<User className="h-4 w-4 text-muted-foreground" />} />
                <InfoRow label="Security Deposit" value={displaySecurityDeposit != null ? formatNPR(displaySecurityDeposit) : "-"} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground break-words">{value}</p>
    </div>
  );
}

function StatCard({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description: string }) {
  return (
    <Card className="overflow-hidden border-none shadow-sm bg-muted/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}
