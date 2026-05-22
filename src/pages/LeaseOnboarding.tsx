import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, User, FileText, 
  CheckCircle2, Building2,
  Wifi, Zap, Droplets, Plus, Trash2,
  Search, ChevronRight, ChevronLeft,
  Percent, Gauge, ClipboardCheck, AlertCircle, Sparkles, X,
  CreditCard
} from "lucide-react";
import { searchTenantsApi, type TenantSearchResult } from "@/lib/api/tenants";
import { createLeaseApi, getLeasesApi } from "@/lib/api/leases";

type Utility = {
  id: string;
  label: string;
  active: boolean;
  type: "fixed" | "metered";
  rate: string;
};

export default function LeaseOnboarding() {
  const { id, unitId } = useParams();
  const navigate = useNavigate();
  usePageTitle("Lease Onboarding");
  
  const [step, setStep] = useState(1);
  const [tenantMode, setTenantMode] = useState<"existing" | "new">("new");
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [stepError, setStepError] = useState("");

  // Tenant search
  const [tenantSearchInput, setTenantSearchInput] = useState("");
  const [existingTenants, setExistingTenants] = useState<TenantSearchResult[]>([]);
  const tenantSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    searchTenantsApi("").then(setExistingTenants).catch(() => {});
  }, []);

  const handleTenantSearch = (q: string) => {
    setTenantSearchInput(q);
    if (tenantSearchRef.current) clearTimeout(tenantSearchRef.current);
    tenantSearchRef.current = setTimeout(() => {
      searchTenantsApi(q).then(setExistingTenants).catch(() => {});
    }, 400);
  };

  // New tenant form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Lease date state
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  
  // Lease State
  const [rentAmount, setRentAmount] = useState("15000");
  const [securityDeposit, setSecurityDeposit] = useState("30000");
  const [securityDepositTouched, setSecurityDepositTouched] = useState(false);
  const [dueDay, setDueDay] = useState("1");
  const [rentIncrease, setRentIncrease] = useState("5");

  // Dynamic Utilities State
  const [utilities, setUtilities] = useState<Utility[]>([
    { id: "electricity", label: "Electricity", active: true, type: "metered", rate: "0.12" },
    { id: "water", label: "Water & Sewage", active: true, type: "fixed", rate: "25" },
    { id: "wifi", label: "Fiber Internet", active: false, type: "fixed", rate: "50" }
  ]);

  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newUtilName, setNewUtilName] = useState("");

  const selectedTenant = existingTenants.find(t => t.id === selectedTenantId) ?? null;

  useEffect(() => {
    if (securityDepositTouched) return;
    const parsedRent = Number(rentAmount);
    if (!Number.isFinite(parsedRent) || parsedRent <= 0) {
      setSecurityDeposit("");
      return;
    }
    setSecurityDeposit((parsedRent * 2).toString());
  }, [rentAmount, securityDepositTouched]);

  const steps = [
    { id: 1, name: "Tenant Identity", icon: <User className="h-4 w-4" /> },
    { id: 2, name: "Lease Terms", icon: <FileText className="h-4 w-4" /> },
    { id: 3, name: "Utility Billing", icon: <Gauge className="h-4 w-4" /> },
    { id: 4, name: "Review & Sign", icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  const handleNext = () => {
    setStepError("");
    if (step === 1) {
      if (tenantMode === "existing" && !selectedTenantId) { setStepError("Please select a tenant to continue."); return; }
      if (tenantMode === "new") {
        if (!newName.trim()) { setStepError("Full name is required."); return; }
        if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) { setStepError("A valid email address is required."); return; }
        if (!newPhone.trim()) { setStepError("Phone number is required."); return; }
      }
    }
    if (step === 2) {
      if (!rentAmount || Number(rentAmount) <= 0) { setStepError("Enter a valid monthly rent amount."); return; }
      if (securityDeposit.trim() && (!Number.isFinite(Number(securityDeposit)) || Number(securityDeposit) < 0)) {
        setStepError("Enter a valid security deposit amount.");
        return;
      }
      if (!leaseStart) { setStepError("Lease start date is required."); return; }
      if (!leaseEnd) { setStepError("Lease end date is required."); return; }
      if (leaseStart >= leaseEnd) { setStepError("Lease end date must be after the start date."); return; }
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const handleBack = () => { setStepError(""); setStep(prev => Math.max(prev - 1, 1)); };

  const resolveCreatedLeaseId = async (): Promise<string | null> => {
    if (!unitId) return null;
    const currentRent = parseFloat(rentAmount);
    const result = await getLeasesApi({
      Page: 1,
      PageSize: 50,
      Search: unitId,
      Status: "Active",
    });

    const exact = result.items.find((lease) =>
      String(lease.unitId) === String(unitId) &&
      lease.propertyId === Number(id) &&
      lease.leaseStart === leaseStart &&
      lease.leaseEnd === leaseEnd &&
      Math.abs(lease.rentAmount - currentRent) < 0.01
    );

    if (exact) return String(exact.id);

    const byUnit = result.items.find((lease) =>
      String(lease.unitId) === String(unitId) && lease.propertyId === Number(id)
    );

    return byUnit ? String(byUnit.id) : null;
  };
  
  const handleFinalize = async () => {
    if (!unitId) {
      toast.error("Missing unit reference. Please reopen onboarding from the unit details page.");
      return;
    }

    try {
      const createdLease = await createLeaseApi({
        propertyId: Number(id),
        unitId,
        tenantId: tenantMode === "existing" ? selectedTenantId ?? null : null,
        newTenant: tenantMode === "new" ? { fullName: newName, email: newEmail, phone: newPhone } : null,
        rentAmount: parseFloat(rentAmount),
        dueDay: parseInt(dueDay),
        leaseStart,
        leaseEnd,
        rentIncreasePercent: parseFloat(rentIncrease),
        securityDeposit: securityDeposit.trim() ? parseFloat(securityDeposit) : 0,
        utilities: utilities.filter(u => u.active).map(u => ({ label: u.label, type: u.type, rate: parseFloat(u.rate), active: true })),
      });

      const leaseId = createdLease?.id ? String(createdLease.id) : await resolveCreatedLeaseId();

      toast.success("Lease onboarding complete!", { description: `Lease for Unit ${unitId} has been created.` });

      if (leaseId) {
        navigate(`/leases/${leaseId}`, { state: { lease: createdLease } });
      } else {
        navigate("/leases");
      }
    } catch {
      toast.error("Failed to create lease. Please try again.");
    }
  };

  const addUtility = () => {
    if (!newUtilName.trim()) {
      setIsAddingInline(false);
      return;
    }
    const utilId = newUtilName.toLowerCase().replace(/\s+/g, '-');
    setUtilities(prev => [
      ...prev,
      { id: utilId, label: newUtilName, active: true, type: "fixed", rate: "0" }
    ]);
    setNewUtilName("");
    setIsAddingInline(false);
  };

  const deleteUtility = (uid: string) => {
    setUtilities(prev => prev.filter(u => u.id !== uid));
  };

  const toggleUtility = (uid: string) => {
    setUtilities(prev => prev.map(u => u.id === uid ? { ...u, active: !u.active } : u));
  };

  const updateUtilityType = (uid: string, type: "fixed" | "metered") => {
    setUtilities(prev => prev.map(u => u.id === uid ? { ...u, type } : u));
  };

  const updateUtilityRate = (uid: string, rate: string) => {
    setUtilities(prev => prev.map(u => u.id === uid ? { ...u, rate } : u));
  };

  const calculateTotalUtilities = () => {
    return utilities
      .filter(u => u.active && u.type === "fixed")
      .reduce((acc, curr) => acc + parseFloat(curr.rate || "0"), 0);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${id}/units/${unitId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lease Onboarding</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
              <Building2 className="h-3 w-3" /> Unit {unitId} • Sunset Manor
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-full px-4 text-xs font-bold text-muted-foreground">
          Step {step} of 4
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Stepper Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {steps.map((s) => (
            <div 
              key={s.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                step === s.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : 
                step > s.id ? "text-emerald-600 bg-emerald-500/5" : "text-muted-foreground"
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                step === s.id ? "border-primary-foreground" : 
                step > s.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"
              }`}>
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
              </div>
              <span className="font-semibold text-sm">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Form Area */}
        <div className="lg:col-span-6">
          <Card className="border-none shadow-xl shadow-foreground/5 min-h-[600px] flex flex-col">
            <CardHeader className="border-b bg-muted/10 flex flex-row items-center justify-between">
              <CardTitle>{steps[step-1].name}</CardTitle>
              {step === 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5 text-xs px-3"
                  onClick={() => setIsAddingInline(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add Utility
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-8">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <Tabs value={tenantMode} onValueChange={(v) => setTenantMode(v as "existing" | "new")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="existing">Select Existing Tenant</TabsTrigger>
                      <TabsTrigger value="new">Create New Profile</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="existing" className="mt-6 space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by name, email or ID..." className="pl-9 h-11" value={tenantSearchInput} onChange={e => handleTenantSearch(e.target.value)} />
                      </div>
                      <div className="grid gap-3">
                        {existingTenants.map((t) => (
                          <div 
                            key={t.id} 
                            onClick={() => setSelectedTenantId(t.id)}
                            className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedTenantId === t.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted border-transparent bg-muted/30"}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center font-bold">
                                {t.fullName.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{t.fullName}</p>
                                <p className="text-xs text-muted-foreground">{t.email}</p>
                              </div>
                            </div>
                            {selectedTenantId === t.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="new" className="mt-6 space-y-6">
                      <div className="grid gap-3">
                        <Label htmlFor="newName">Legal Full Name</Label>
                        <Input id="newName" placeholder="e.g. Sarah Williams" className="h-11" value={newName} onChange={e => { setNewName(e.target.value); setStepError(""); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="newEmail">Email Address</Label>
                          <Input id="newEmail" type="email" placeholder="sarah@example.com" className="h-11" value={newEmail} onChange={e => { setNewEmail(e.target.value); setStepError(""); }} />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="newPhone">Primary Phone</Label>
                          <Input id="newPhone" placeholder="+977 98XXXXXXXX" className="h-11" value={newPhone} onChange={e => { setNewPhone(e.target.value); setStepError(""); }} />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="rentAmount">Monthly Rent Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground text-xs font-medium">Rs.</span>
                        <Input 
                          id="rentAmount" 
                          className="pl-7 h-11 text-lg font-bold" 
                          value={rentAmount}
                          onChange={(e) => {
                            setRentAmount(e.target.value);
                            setStepError("");
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="dueDay">Monthly Payment Due Day</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="dueDay" 
                          type="number" 
                          min="1" 
                          max="31" 
                          value={dueDay} 
                          onChange={(e) => setDueDay(e.target.value)}
                          className="pl-9 h-11 font-bold" 
                        />
                        <span className="absolute right-3 top-3 text-[10px] uppercase font-bold text-muted-foreground">Day of month</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="securityDeposit">Security Deposit</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground text-xs font-medium">Rs.</span>
                        <Input
                          id="securityDeposit"
                          className="pl-7 h-11 font-bold"
                          placeholder="0"
                          value={securityDeposit}
                          onChange={(e) => {
                            setSecurityDepositTouched(true);
                            setSecurityDeposit(e.target.value);
                            setStepError("");
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Defaults to 2x monthly rent. You can edit or clear it.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="leaseStart">Lease Start Date</Label>
                      <Input id="leaseStart" type="date" className="h-11" value={leaseStart} onChange={e => { setLeaseStart(e.target.value); setStepError(""); }} />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="leaseEnd">Lease End Date</Label>
                      <Input id="leaseEnd" type="date" className="h-11" value={leaseEnd} onChange={e => { setLeaseEnd(e.target.value); setStepError(""); }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="rentIncrease">Annual Rent Increase (%)</Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="rentIncrease" 
                          type="number" 
                          value={rentIncrease} 
                          onChange={(e) => setRentIncrease(e.target.value)}
                          className="pl-9 h-11" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-4">
                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                    <p className="text-xs text-orange-700 leading-relaxed">
                        Security deposit is prefilled at 2 months rent and can be adjusted for this lease.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="rounded-xl border overflow-hidden">
                    <div className="bg-muted/30 grid grid-cols-12 gap-2 p-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-b">
                      <div className="col-span-5">Service Name</div>
                      <div className="col-span-3">Billing Type</div>
                      <div className="col-span-3">Rate/Amt</div>
                      <div className="col-span-1 text-right"></div>
                    </div>
                    <div className="divide-y max-h-[350px] overflow-y-auto">
                      {utilities.map((u) => (
                        <UtilityLedgerRow 
                          key={u.id}
                          id={u.id}
                          icon={u.id === 'electricity' ? <Zap className="h-3 w-3 text-yellow-500" /> : u.id === 'water' ? <Droplets className="h-3 w-3 text-blue-500" /> : u.id === 'wifi' ? <Wifi className="h-3 w-3 text-primary" /> : <Sparkles className="h-3 w-3 text-emerald-500" />} 
                          label={u.label} 
                          config={u} 
                          onToggle={() => toggleUtility(u.id)}
                          onTypeChange={(v: any) => updateUtilityType(u.id, v)}
                          onRateChange={(v: any) => updateUtilityRate(u.id, v)}
                          onDelete={() => deleteUtility(u.id)}
                        />
                      ))}
                      
                      {isAddingInline ? (
                        <div className="p-3 bg-primary/5 flex items-center gap-3 animate-in fade-in duration-200">
                          <Input 
                            autoFocus
                            placeholder="Service Name..." 
                            className="h-8 text-xs flex-1 rounded-lg"
                            value={newUtilName}
                            onChange={(e) => setNewUtilName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addUtility()}
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-8 px-3 text-[10px] font-bold" onClick={addUtility}>Add</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsAddingInline(false)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-3 text-center text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer flex items-center justify-center gap-2 transition-colors group"
                          onClick={() => setIsAddingInline(true)}
                        >
                          <Plus className="h-3 w-3 group-hover:text-primary transition-colors" />
                          <span>Add another custom utility...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {utilities.length > 0 && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-2 px-1">
                      <AlertCircle className="h-3 w-3" />
                      Toggling off a utility will exclude it from this lease agreement.
                    </p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-6">
                    <div className="flex items-center gap-6 p-6 rounded-2xl bg-muted/30 border border-muted shadow-inner">
                      <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/20">
                        {(tenantMode === "existing" ? selectedTenant?.fullName : newName || "New Tenant")?.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{tenantMode === "existing" ? selectedTenant?.fullName : (newName || "New Tenant")}</h3>
                        <p className="text-sm text-muted-foreground">{tenantMode === "existing" ? selectedTenant?.email : newEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <SummaryCard label="Monthly Rent" value={`Rs. ${parseFloat(rentAmount).toLocaleString()}`} sub={`Due on the ${dueDay}${["1","21","31"].includes(dueDay) ? "st" : dueDay === "2" || dueDay === "22" ? "nd" : dueDay === "3" || dueDay === "23" ? "rd" : "th"}`} />
                      <SummaryCard label="Lease Term" value="12 Months" sub="Fixed-term" />
                      <SummaryCard label="Included Utilities" value={`${utilities.filter(u => u.active).length} Services`} sub="Managed by PMS" />
                      <SummaryCard label="Security Deposit" value={`Rs. ${parseFloat(securityDeposit || "0").toLocaleString()}`} sub="One-time payment" />
                    </div>
                  </div>

                </div>
              )}
            </CardContent>
            <div className="p-6 border-t bg-muted/10 flex flex-col gap-3">
              {stepError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive" role="alert">
                  {stepError}
                </div>
              )}
              <div className="flex justify-between">
              {step > 1 ? (
                <Button variant="outline" className="gap-2 px-6" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous Step
                </Button>
              ) : (
                <div></div>
              )}

              {step < 4 ? (
                <Button 
                  className="gap-2 px-8" 
                  onClick={handleNext}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-10" onClick={handleFinalize}>
                  Complete Onboarding
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              </div>
            </div>
          </Card>
        </div>

        {/* Live Preview / Helper Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Live Est. Monthly
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Rent</span>
                  <span className="font-bold">Rs. {parseFloat(rentAmount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilities (Fixed)</span>
                  <span className="font-bold">Rs. {calculateTotalUtilities().toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t flex justify-between items-end">
                  <span className="text-sm font-bold">Total Est.</span>
                  <span className="text-2xl font-black text-primary">Rs. {(parseFloat(rentAmount || "0") + calculateTotalUtilities()).toFixed(2)}</span>
                </div>
                {utilities.some(u => u.active && u.type === 'metered') && (
                  <p className="text-[10px] text-muted-foreground italic mt-2">
                    * Excludes metered usage (Electricity/Water)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-2xl border bg-muted/10 space-y-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Automation Setting</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Invoices will be automatically generated and sent to the tenant on the <strong>{dueDay}th</strong> of every month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UtilityLedgerRow({ icon, label, config, onToggle, onTypeChange, onRateChange, onDelete }: any) {
  return (
    <div className={`grid grid-cols-12 gap-2 p-2 px-3 items-center transition-all ${config.active ? "bg-background" : "bg-muted/10 opacity-60"}`}>
      <div className="col-span-5 flex items-center gap-2">
        <Button 
          variant={config.active ? "default" : "outline"} 
          size="icon" 
          className="h-6 w-6 shrink-0"
          onClick={onToggle}
        >
          {config.active ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3" />}
        </Button>
        <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs font-semibold truncate">{label}</span>
      </div>
      
      <div className="col-span-3">
        {config.active && (
          <Select value={config.type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-7 text-[10px] bg-background px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed" className="text-[10px]">Fixed</SelectItem>
              <SelectItem value="metered" className="text-[10px]">Metered</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="col-span-3">
        {config.active && (
          <div className="relative">
            <span className="absolute left-2 top-1.5 text-[9px] text-muted-foreground">$</span>
            <Input 
              className="h-7 pl-4 text-[10px] bg-background font-mono" 
              value={config.rate} 
              onChange={(e) => onRateChange(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="col-span-1 text-right">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string, value: string, sub: string }) {
  return (
    <div className="p-4 rounded-xl border bg-background shadow-sm">
      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-1">{sub}</p>
    </div>
  );
}
