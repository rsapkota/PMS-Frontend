import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, Clock, Home, TrendingUp, TrendingDown,
  ArrowUpRight, Users, Building2, Wallet, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect, useState } from "react";
import {
  getDashboardSummaryApi,
  getDashboardActivityApi,
  getExpiringLeasesApi,
  getTenantDashboardApi,
} from "@/lib/api/dashboard";
import type {
  AdminDashboardSummary,
  DashboardActivity,
  ExpiringLease,
  TenantDashboard as TenantDashboardDto,
} from "@/lib/api/dashboard";
import { formatNPR } from "@/lib/currency";
import { toast } from "sonner";

function getActivityIcon(type: string) {
  if (type === "Lease") return <Home className="h-4 w-4 text-primary" />;
  if (type === "Maintenance") return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <Users className="h-4 w-4 text-emerald-500" />;
}

export default function Dashboard() {
  const { role } = useRole();
  const navigate = useNavigate();
  usePageTitle(role === "Tenant" ? "My Dashboard" : "Dashboard");

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [expiringLeases, setExpiringLeases] = useState<ExpiringLease[]>([]);

  useEffect(() => {
    if (role === "Tenant") return;
    Promise.all([
      getDashboardSummaryApi(),
      getDashboardActivityApi(5),
      getExpiringLeasesApi(60),
    ])
      .then(([s, a, e]) => {
        setSummary(s);
        setActivity(a);
        setExpiringLeases(e);
      })
      .catch(() => toast.error("Failed to load dashboard data"));
  }, [role]);

  if (role === "Tenant") return <TenantDashboardView />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground text-sm italic">Welcome back. Here's what's happening today.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue" 
          value={summary ? formatNPR(summary.totalRevenue) : "—"} 
          change="+12%" 
          trend="up"
          subtext="from last month"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <StatCard 
          title="Active Properties" 
          value={summary ? String(summary.activeProperties) : "—"} 
          change={summary ? `${summary.totalUnits} units` : "—"} 
          trend="up"
          subtext="total units"
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
        />
        <StatCard 
          title="Occupancy Rate" 
          value={summary ? `${summary.occupancyRate}%` : "—"} 
          change={summary ? `${summary.vacantUnits} vacant` : "—"} 
          trend="up"
          subtext="units available"
          icon={<Users className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard 
          title="Pending Requests" 
          value={summary ? String(summary.pendingRequests) : "—"} 
          change="Urgent" 
          trend="down"
          subtext="requires attention"
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          pulse={(summary?.pendingRequests ?? 0) > 0}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs font-bold rounded-xl" onClick={() => navigate("/reminders")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              ) : activity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 group hover:bg-muted/30 p-3 rounded-2xl transition-all cursor-pointer">
                  <div className="h-10 w-10 rounded-xl bg-background border shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-snug">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">{item.relativeTime}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-foreground/5 rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground">Contracts Ending Soon</CardTitle>
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 font-black uppercase text-[10px] tracking-widest px-3 py-1 animate-pulse">
                Action Required
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {expiringLeases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No leases expiring soon.</p>
              ) : expiringLeases.map((contract) => {
                const critical = contract.daysLeft <= 30;
                return (
                  <div key={contract.leaseId} className={`flex items-center gap-4 group p-3 rounded-2xl transition-all ${critical ? "hover:bg-red-50" : "hover:bg-muted/30"}`}>
                    <div className={`h-10 w-10 rounded-xl bg-background border shadow-sm flex items-center justify-center shrink-0 ${critical ? "ring-1 ring-red-100" : ""}`}>
                      <Clock className={`h-4 w-4 ${critical ? "text-red-500" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{contract.tenantName}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase truncate tracking-tighter mt-0.5">
                        {contract.propertyName} #{contract.unitNumber} • {contract.leaseEnd}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${critical ? "text-red-600" : "text-emerald-600"}`}>
                        {contract.daysLeft} DAYS LEFT
                      </p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-bold rounded-lg text-primary hover:bg-primary/10 px-2" onClick={() => navigate("/leases")}>RENEW</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, subtext, icon, pulse }: { title: string; value: string; change: string; trend: "up" | "down"; subtext: string; icon: React.ReactNode; pulse?: boolean }) {
  return (
    <Card className="border-none shadow-sm bg-muted/20 hover:bg-muted/30 transition-all rounded-3xl group">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{title}</p>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-tighter ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold italic opacity-70 whitespace-nowrap">{subtext}</span>
          </div>
        </div>
        <div className={`h-14 w-14 rounded-2xl bg-background border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ring-1 ring-black/[0.02] ${pulse ? "ring-2 ring-red-300 animate-pulse" : ""}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TenantDashboardView() {
  const navigate = useNavigate();
  const [data, setData] = useState<TenantDashboardDto | null>(null);

  useEffect(() => {
    getTenantDashboardApi()
      .then(setData)
      .catch(() => toast.error("Failed to load tenant dashboard"));
  }, []);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Rent"
          value={data ? formatNPR(data.monthlyRent) : "—"}
          change={data ? `Due on day ${1}` : "—"}
          trend="up"
          subtext="per month"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Lease Ends"
          value={data ? data.leaseEnd : "—"}
          change="Fixed term"
          trend="up"
          subtext="lease end date"
          icon={<Clock className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Open Requests"
          value={data ? String(data.openRequests) : "—"}
          change="Maintenance"
          trend="down"
          subtext="active requests"
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          title="Balance Due"
          value={data ? formatNPR(data.balanceDue) : "—"}
          change={data?.balanceDue === 0 ? "All paid" : "Pending"}
          trend={data?.balanceDue === 0 ? "up" : "down"}
          subtext="outstanding balance"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.paymentHistory ?? []).map((pay, i) => (
                <div key={i} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{pay.month} — {formatNPR(pay.amount)}</p>
                    <p className="text-xs text-muted-foreground">{pay.status}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{pay.status}</Badge>
                </div>
              ))}
              {!data?.paymentHistory?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No payment history.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open Maintenance Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.openMaintenanceRequests ?? []).map((req) => (
                <div key={req.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{req.title}</p>
                    <p className="text-xs text-muted-foreground">{req.priority} priority</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{req.status}</Badge>
                </div>
              ))}
              {!data?.openMaintenanceRequests?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No open requests.</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate("/maintenance")}>
              View All Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
