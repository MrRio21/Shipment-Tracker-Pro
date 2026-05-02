import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShipments } from "@/hooks/use-shipments";
import { useDrivers } from "@/hooks/use-drivers";
import { useTrucks } from "@/hooks/use-trucks";
import { useDispatches } from "@/hooks/use-dispatches";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { CheckCircle2, FileSpreadsheet, Loader2, Search, Truck, Users } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/app-header";
import { AddDriverButton } from "@/components/add-driver-modal";
import { AddTruckButton } from "@/components/add-truck-modal";

const dispatchSchema = z.object({
  containerNumber: z.string().min(1, { message: "Container Number is required" }),
  driverId: z.string().min(1, { message: "Driver is required" }),
  truckId: z.string().min(1, { message: "Truck is required" }),
  entryTime: z.string().min(1, { message: "Entry time is required" }),
  cargoDeliveryDate: z.string().min(1, { message: "Cargo delivery date is required" }),
  emptyReturnDate: z.string().min(1, { message: "Empty return date is required" }),
});

type DispatchFormValues = z.infer<typeof dispatchSchema>;

export default function Dispatch() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { shipments } = useShipments();
  const { drivers, addDriver } = useDrivers();
  const { trucks } = useTrucks();
  const { dispatches, isLoading: dispatchesLoading, addDispatch, markReturned } = useDispatches();
  const [dispatchQuery, setDispatchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      containerNumber: "",
      driverId: "",
      truckId: "",
      entryTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      cargoDeliveryDate: today,
      emptyReturnDate: today,
    },
  });

  const isDriverBusy = (driverId: string) =>
    dispatches.some((d) => d.driverId === driverId && d.returnedAt == null);

  const uniqueContainers = useMemo(
    () => Array.from(new Set(shipments.map((s) => s.containerNumber))).filter(Boolean).sort(),
    [shipments],
  );

  const containerOptions = useMemo(
    () => uniqueContainers.map((c) => ({ value: c, label: c })),
    [uniqueContainers],
  );

  const driverOptions = useMemo(
    () =>
      drivers.map((d) => ({
        value: d.id,
        label: `${d.name}${isDriverBusy(d.id) ? " · Busy" : ""}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drivers, dispatches],
  );

  const truckOptions = useMemo(
    () => trucks.map((t) => ({ value: t.id, label: `${t.model} — ${t.plateNumber}` })),
    [trucks],
  );

  const filteredDispatches = useMemo(() => {
    const q = dispatchQuery.trim().toLowerCase();
    if (!q) return dispatches;
    return dispatches.filter((d) => {
      const truckText = d.truck ? `${d.truck.model} ${d.truck.plateNumber}` : "";
      const haystack = [
        d.containerNumber,
        d.driver?.name ?? "",
        d.driver?.phone ?? "",
        truckText,
        d.entryTime,
        d.cargoDeliveryDate ?? "",
        d.emptyReturnDate ?? "",
        d.returnedAt ? "returned" : "active",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [dispatches, dispatchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  async function onSubmit(data: DispatchFormValues) {
    setSubmitting(true);
    try {
      await addDispatch(data);
      const now = new Date();
      form.reset({
        containerNumber: "",
        driverId: "",
        truckId: "",
        entryTime: format(now, "yyyy-MM-dd'T'HH:mm"),
        cargoDeliveryDate: format(now, "yyyy-MM-dd"),
        emptyReturnDate: format(now, "yyyy-MM-dd"),
      });
      const driverName = drivers.find((d) => d.id === data.driverId)?.name || "Driver";
      toast.success("Dispatch logged successfully", {
        description: `Container ${data.containerNumber} assigned to ${driverName}`,
        icon: <Truck className="h-4 w-4" />,
      });
    } catch (err) {
      toast.error("Failed to log dispatch", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onMarkReturned(dispatchId: string, driverName: string, containerNumber: string) {
    try {
      await markReturned(dispatchId);
      toast.success("Dispatch marked as returned", {
        description: `${driverName} is now available · Container ${containerNumber}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (err) {
      toast.error("Failed to mark as returned", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  }

  const exportToExcel = () => {
    const rows = filteredDispatches.map((d) => ({
      "Container Number": d.containerNumber,
      "Driver Name": d.driver?.name || "Unknown",
      "Phone": d.driver?.phone || "N/A",
      "Truck": d.truck ? `${d.truck.model} — ${d.truck.plateNumber}` : "Unknown",
      "Entry Time": format(new Date(d.entryTime), "yyyy-MM-dd HH:mm"),
      "Cargo Delivery Date": d.cargoDeliveryDate ?? "",
      "Empty Return Date": d.emptyReturnDate ?? "",
      "Status": d.returnedAt ? "Returned" : "Active",
      "Returned At": d.returnedAt ? format(new Date(d.returnedAt), "yyyy-MM-dd HH:mm") : "",
    }));
    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatches");
    XLSX.writeFile(wb, `dispatches-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const formatDateCell = (value: string | null | undefined) =>
    value ? format(new Date(value), "MMM d, yyyy") : "—";

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Drivers Section */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Drivers Management
                </CardTitle>
                <CardDescription>Manage your fleet of registered drivers</CardDescription>
              </div>
              <AddDriverButton
                onSuccess={() => {}}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {drivers.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center bg-background border border-border/50 rounded-lg border-dashed">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-medium">No drivers registered</h3>
                <p className="text-xs text-muted-foreground mt-1">Register drivers before logging dispatches.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {drivers.map((driver) => {
                  const busy = isDriverBusy(driver.id);
                  return (
                    <div
                      key={driver.id}
                      className="p-4 rounded-lg border border-border/50 bg-background flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{driver.name}</span>
                        {busy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            Busy
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Available
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{driver.phone}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dispatch Form */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Log Dispatch
            </CardTitle>
            <CardDescription>Assign containers to drivers for dispatch</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="containerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Container Number</FormLabel>
                        <FormControl>
                          <Combobox
                            options={containerOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={containerOptions.length === 0 ? "No shipments exist" : "Search & select container"}
                            searchPlaceholder="Type to search containers..."
                            emptyText="No matching container."
                            disabled={containerOptions.length === 0 || submitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver</FormLabel>
                        <FormControl>
                          <Combobox
                            options={driverOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={driverOptions.length === 0 ? "No drivers exist" : "Search & select driver"}
                            searchPlaceholder="Type to search drivers..."
                            emptyText="No matching driver."
                            disabled={driverOptions.length === 0 || submitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="truckId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Truck</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <FormControl>
                              <Combobox
                                options={truckOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={truckOptions.length === 0 ? "No trucks — add one" : "Search & select truck"}
                                searchPlaceholder="Type to search trucks..."
                                emptyText="No matching truck."
                                disabled={truckOptions.length === 0 || submitting}
                              />
                            </FormControl>
                          </div>
                          <AddTruckButton
                            iconOnly
                            onSuccess={(id) => form.setValue("truckId", id, { shouldValidate: true })}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entryTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Entry Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} disabled={submitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cargoDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={submitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emptyReturnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empty Return Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={submitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-border/40">
                  <Button
                    type="submit"
                    className="min-w-[150px]"
                    disabled={submitting || uniqueContainers.length === 0 || drivers.length === 0 || trucks.length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Log Dispatch"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Dispatch Records Table */}
        <Card className="shadow-sm border-border/60 overflow-hidden">
          <div className="flex flex-col gap-4 p-6 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold">Dispatch Records</CardTitle>
                <CardDescription className="mt-1">
                  {dispatchesLoading ? (
                    "Loading..."
                  ) : (
                    <>
                      {dispatches.length} record{dispatches.length !== 1 ? "s" : ""} in the database
                      {dispatchQuery && (
                        <span className="ml-1 text-foreground">
                          · showing {filteredDispatches.length}
                        </span>
                      )}
                    </>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={filteredDispatches.length === 0 || dispatchesLoading}
                className="gap-2 bg-background"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export to Excel
              </Button>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={dispatchQuery}
                onChange={(e) => setDispatchQuery(e.target.value)}
                placeholder="Search by container, driver, truck, status..."
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {dispatchesLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : dispatches.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium">No dispatches logged</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Start by assigning a container to a driver.
                </p>
              </div>
            ) : filteredDispatches.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-medium">No matching dispatches</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No records match "{dispatchQuery}".
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Container #</TableHead>
                    <TableHead className="font-semibold">Driver</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Truck</TableHead>
                    <TableHead className="font-semibold">Entry Time</TableHead>
                    <TableHead className="font-semibold">Cargo Delivery</TableHead>
                    <TableHead className="font-semibold">Empty Return</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold text-right">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDispatches.map((dispatch) => {
                    const driverName = dispatch.driver?.name || "Unknown";
                    const truckDisplay = dispatch.truck
                      ? `${dispatch.truck.model} — ${dispatch.truck.plateNumber}`
                      : "—";
                    const isReturned = dispatch.returnedAt != null;
                    return (
                      <TableRow key={dispatch.id} className="group">
                        <TableCell className="uppercase font-mono text-xs">
                          {dispatch.containerNumber}
                        </TableCell>
                        <TableCell className="font-medium">{driverName}</TableCell>
                        <TableCell>{dispatch.driver?.phone || "N/A"}</TableCell>
                        <TableCell>{truckDisplay}</TableCell>
                        <TableCell>
                          {format(new Date(dispatch.entryTime), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{formatDateCell(dispatch.cargoDeliveryDate)}</TableCell>
                        <TableCell>{formatDateCell(dispatch.emptyReturnDate)}</TableCell>
                        <TableCell>
                          {isReturned ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Returned
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(dispatch.returnedAt!), { addSuffix: true })}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isReturned ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-8 text-xs"
                              onClick={() =>
                                onMarkReturned(dispatch.id, driverName, dispatch.containerNumber)
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Mark Returned
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(dispatch.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
