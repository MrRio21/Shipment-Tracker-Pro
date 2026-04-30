import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShipments } from "@/hooks/use-shipments";
import { useDrivers } from "@/hooks/use-drivers";
import { useDispatches } from "@/hooks/use-dispatches";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, FileSpreadsheet, Truck, Users } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/app-header";
import { AddDriverButton } from "@/components/add-driver-modal";

const dispatchSchema = z.object({
  containerNumber: z.string().min(1, { message: "Container Number is required" }),
  driverId: z.string().min(1, { message: "Driver is required" }),
  truckInfo: z.string().min(1, { message: "Truck Information is required" }),
  entryTime: z.string().min(1, { message: "Entry time is required" }),
  cargoDeliveryDate: z.string().min(1, { message: "Cargo delivery date is required" }),
  emptyReturnDate: z.string().min(1, { message: "Empty return date is required" }),
});

type DispatchFormValues = z.infer<typeof dispatchSchema>;

export default function Dispatch() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { shipments } = useShipments();
  const { drivers } = useDrivers();
  const { dispatches, addDispatch, markReturned } = useDispatches();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      containerNumber: "",
      driverId: "",
      truckInfo: "",
      entryTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      cargoDeliveryDate: today,
      emptyReturnDate: today,
    },
  });

  if (!isAuthenticated) return null;

  const isDriverBusy = (driverId: string) =>
    dispatches.some((d) => d.driverId === driverId && d.returnedAt == null);

  function onSubmit(data: DispatchFormValues) {
    addDispatch(data);
    const now = new Date();
    form.reset({
      containerNumber: "",
      driverId: "",
      truckInfo: "",
      entryTime: format(now, "yyyy-MM-dd'T'HH:mm"),
      cargoDeliveryDate: format(now, "yyyy-MM-dd"),
      emptyReturnDate: format(now, "yyyy-MM-dd"),
    });

    const driverName = drivers.find((d) => d.id === data.driverId)?.name || "Unknown Driver";
    toast.success("Dispatch logged successfully", {
      description: `Container ${data.containerNumber} assigned to ${driverName}`,
      icon: <Truck className="h-4 w-4" />,
    });
  }

  function onMarkReturned(dispatchId: string, driverName: string, containerNumber: string) {
    markReturned(dispatchId);
    toast.success("Dispatch marked as returned", {
      description: `${driverName} is now available · Container ${containerNumber}`,
      icon: <CheckCircle2 className="h-4 w-4" />,
    });
  }

  const exportToExcel = () => {
    if (dispatches.length === 0) return;

    const rows = dispatches.map((d) => {
      const driver = drivers.find((drv) => drv.id === d.driverId);
      return {
        "Container Number": d.containerNumber,
        "Driver Name": driver?.name || "Unknown",
        "Phone": driver?.phone || "N/A",
        "Truck": d.truckInfo,
        "Entry Time": format(new Date(d.entryTime), "yyyy-MM-dd HH:mm"),
        "Cargo Delivery Date": d.cargoDeliveryDate ?? "",
        "Empty Return Date": d.emptyReturnDate ?? "",
        "Dispatch Status": d.returnedAt ? "Returned" : "Active",
        "Returned At": d.returnedAt ? format(new Date(d.returnedAt), "yyyy-MM-dd HH:mm") : "",
        "Driver Status": driver && isDriverBusy(driver.id) ? "Busy" : "Available",
        "Added": format(new Date(d.addedAt), "yyyy-MM-dd HH:mm"),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatches");
    const filename = `dispatches-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Deduplicate container numbers for the select
  const uniqueContainers = Array.from(new Set(shipments.map((s) => s.containerNumber))).sort();

  const formatDateCell = (value: string | undefined | null) =>
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
              <AddDriverButton />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {drivers.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center px-4 bg-background border border-border/50 rounded-lg border-dashed">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-medium text-foreground">No drivers registered</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Register drivers before logging dispatches.
                </p>
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

        {/* Entry Form */}
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={uniqueContainers.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={uniqueContainers.length === 0 ? "No shipments exist" : "Select container"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uniqueContainers.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={drivers.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={drivers.length === 0 ? "No drivers exist" : "Select driver"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                                {isDriverBusy(d.id) ? " · Busy" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="truckInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Truck Information</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Volvo FH16 — Plate 1234" {...field} />
                        </FormControl>
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
                          <Input type="datetime-local" {...field} />
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
                          <Input type="date" {...field} />
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
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <div className="flex justify-end pt-2 border-t border-border/40">
                  <Button type="submit" className="min-w-[150px]" disabled={uniqueContainers.length === 0 || drivers.length === 0}>
                    Log Dispatch
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-sm border-border/60 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-lg font-semibold">Dispatch Records</CardTitle>
              <CardDescription className="mt-1">Recent dispatch assignments</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={dispatches.length === 0}
              className="gap-2 bg-background"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export to Excel
            </Button>
          </div>

          <div className="overflow-x-auto">
            {dispatches.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No dispatches logged</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Dispatches you log will appear here. Start by assigning a container to a driver.
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
                  {dispatches.map((dispatch) => {
                    const driver = drivers.find((d) => d.id === dispatch.driverId);
                    const driverName = driver?.name || "Unknown";
                    const isReturned = dispatch.returnedAt != null;
                    return (
                      <TableRow key={dispatch.id} className="group">
                        <TableCell className="uppercase font-mono text-xs">{dispatch.containerNumber}</TableCell>
                        <TableCell className="font-medium text-foreground">{driverName}</TableCell>
                        <TableCell>{driver?.phone || "N/A"}</TableCell>
                        <TableCell>{dispatch.truckInfo}</TableCell>
                        <TableCell>{format(new Date(dispatch.entryTime), "MMM d, yyyy HH:mm")}</TableCell>
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
                              onClick={() => onMarkReturned(dispatch.id, driverName, dispatch.containerNumber)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Mark Returned
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(dispatch.addedAt), { addSuffix: true })}
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
