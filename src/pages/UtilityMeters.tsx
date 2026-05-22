import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArrowLeft, Plus, Trash2, Zap, Droplets } from "lucide-react";
import { getMetersApi, createMeterApi, deleteMeterApi, updateMeterApi, type MeterDto } from "@/lib/api/meters";

type MeterType = "Electricity" | "Water";

function toOrdinalWord(index: number): string {
  const words = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  if (index >= 1 && index <= words.length) return words[index - 1];

  const mod10 = index % 10;
  const mod100 = index % 100;
  let suffix = "th";
  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";

  return `${index}${suffix}`;
}

function getNextMeterLabel(existingCount: number): string {
  return `${toOrdinalWord(existingCount + 1)} Meter`;
}

export default function UtilityMeters() {
  const navigate = useNavigate();
  const { id, unitId } = useParams();
  usePageTitle("Utility Meters");

  const [meters, setMeters] = useState<MeterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meterType, setMeterType] = useState<MeterType>("Electricity");
  const [meterNumber, setMeterNumber] = useState("");
  const [lastReading, setLastReading] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<MeterDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextMeterLabel = useMemo(() => getNextMeterLabel(meters.length), [meters.length]);

  // Load meters on mount or when unitId changes
  useEffect(() => {
    if (!unitId) return;
    
    const loadMeters = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getMetersApi(unitId);
        setMeters(result.items);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load meters";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadMeters();
  }, [unitId]);

  const electricityCount = useMemo(() => meters.filter((m) => m.type === "Electricity").length, [meters]);
  const waterCount = useMemo(() => meters.filter((m) => m.type === "Water").length, [meters]);

  if (!id || !unitId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Missing Unit Information</h1>
        <Button className="mt-4" onClick={() => navigate("/properties")}>Back to Properties</Button>
      </div>
    );
  }

  const addMeter = async () => {
    const number = meterNumber.trim();
    const readingText = lastReading.trim();
    const parsedReading = readingText ? Number(readingText) : undefined;
    const generatedLabel = getNextMeterLabel(meters.length);

    if (!readingText) {
      toast.error("Last reading is required.");
      return;
    }
    if (!Number.isFinite(parsedReading) || parsedReading < 0) {
      toast.error("Last reading must be a valid non-negative number.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createMeterApi(unitId!, {
        type: meterType,
        meterNumber: number || null,
        label: generatedLabel,
        lastReading: parsedReading,
      });

      // Reload meters from API
      const result = await getMetersApi(unitId!);
      setMeters(result.items);

      setMeterNumber("");
      setLastReading("");
      setMeterType("Electricity");
      setIsAddDialogOpen(false);
      toast.success("Meter added.");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to add meter";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMeter = async (meterId: string) => {
    try {
      await deleteMeterApi(unitId!, meterId);

      // Reload meters from API
      const result = await getMetersApi(unitId!);
      setMeters(result.items);

      toast.success("Meter removed.");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete meter";
      toast.error(errorMsg);
    }
  };

  const toggleStatus = async (meterId: string) => {
    const meter = meters.find((m) => m.id === meterId);
    if (!meter) return;

    try {
      await updateMeterApi(unitId!, meterId, {
        isActive: !meter.isActive,
      });

      // Reload meters from API
      const result = await getMetersApi(unitId!);
      setMeters(result.items);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update meter";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${id}/units/${unitId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Utility Meters</h1>
            <p className="text-sm text-muted-foreground mt-1">Unit {unitId} meter registry</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Meter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Electricity Meters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{electricityCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-500" />Water Meters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{waterCount}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meter</DialogTitle>
            <DialogDescription>Register a new unit meter with its latest recorded reading.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label>Meter Type</Label>
              <Select value={meterType} onValueChange={(v) => v && setMeterType(v as MeterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electricity">Electricity</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Meter Number</Label>
              <Input placeholder="e.g. EL-000321 (optional)" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Label (Auto Generated)</Label>
              <Input value={nextMeterLabel} readOnly aria-readonly="true" />
            </div>
            <div className="grid gap-2">
              <Label>Last Reading</Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 1245.6"
                value={lastReading}
                onChange={(e) => setLastReading(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button className="gap-2" onClick={addMeter} disabled={isSubmitting}>
              {isSubmitting ? <span className="animate-spin">⏳</span> : <Plus className="h-4 w-4" />}
              {isSubmitting ? "Adding..." : "Add Meter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registered Meters</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <p className="font-medium">Error loading meters</p>
              <p className="text-sm">{error}</p>
              <Button className="mt-2" onClick={() => unitId && getMetersApi(unitId).then(r => setMeters(r.items))}>
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Meter Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Last Reading</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No meters added for this unit.</TableCell>
                  </TableRow>
                ) : (
                  meters.map((meter) => (
                    <TableRow key={meter.id}>
                      <TableCell>{meter.type}</TableCell>
                      <TableCell className="font-bold">{meter.meterNumber || "-"}</TableCell>
                      <TableCell>{meter.label}</TableCell>
                      <TableCell>
                        {meter.lastReading}
                      </TableCell>
                      <TableCell>
                        <button
                          className="inline-flex"
                          onClick={() => toggleStatus(meter.id)}
                          type="button"
                        >
                          <Badge className={meter.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}>
                            {meter.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setMeterToDelete(meter)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Meters are synced with backend API and persist across sessions.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={meterToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMeterToDelete(null);
        }}
        title="Delete meter?"
        description={`Are you sure you want to delete ${meterToDelete?.label ?? "this meter"}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (!meterToDelete) return;
          removeMeter(meterToDelete.id);
          setMeterToDelete(null);
        }}
      />
    </div>
  );
}
