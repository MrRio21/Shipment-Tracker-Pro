import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShipments, getContainerNumbers, getHijriDate } from "@/hooks/use-shipments";
import { useClients } from "@/hooks/use-clients";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, FileSpreadsheet, Ship, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/app-header";
import { AddClientButton } from "@/components/add-client-modal";
import { cn } from "@/lib/utils";
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_en from "react-date-object/locales/arabic_en";

const HIJRI_FORMAT = "DD MMMM YYYY";

const todayHijri = () =>
  new DateObject({ calendar: arabic, locale: arabic_en }).format(HIJRI_FORMAT);

const shipmentSchema = z
  .object({
    bayanNo: z.string().min(1, { message: "Bayan No is required" }),
    clientName: z.string().min(1, { message: "Client Name is required" }),
    shipmentType: z.enum(["LCL", "FCL", "AIR"], { required_error: "Type is required" }),
    containersCount: z.coerce.number().int().min(1).max(20),
    containerNumbers: z
      .array(z.string().min(1, { message: "Container number is required" }))
      .min(1),
    lastPulloutDateHijri: z.string().min(1, { message: "Hijri pullout date is required" }),
    terminal: z.enum(["RSGT", "DP", "MAW", "SAL", "SATS"], { required_error: "Terminal is required" }),
  })
  .refine((data) => data.containerNumbers.length === data.containersCount, {
    message: "Number of container entries must match the selected containers count",
    path: ["containerNumbers"],
  });

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { shipments, addShipment } = useShipments();
  const { clients, removeClient } = useClients();
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      bayanNo: "",
      clientName: "",
      shipmentType: "FCL",
      containersCount: 1,
      containerNumbers: [""],
      lastPulloutDateHijri: todayHijri(),
      terminal: "RSGT",
    },
  });

  const containersCount = Number(form.watch("containersCount")) || 1;

  // Resize the container number array whenever the count changes.
  useEffect(() => {
    const current = form.getValues("containerNumbers") || [];
    if (current.length === containersCount) return;
    const next = Array.from({ length: containersCount }, (_, i) => current[i] ?? "");
    form.setValue("containerNumbers", next, { shouldValidate: false });
  }, [containersCount, form]);

  if (!isAuthenticated) return null;

  function onSubmit(data: ShipmentFormValues) {
    addShipment({
      bayanNo: data.bayanNo,
      clientName: data.clientName,
      shipmentType: data.shipmentType,
      containersCount: data.containersCount,
      containerNumbers: data.containerNumbers,
      lastPulloutDateHijri: data.lastPulloutDateHijri,
      terminal: data.terminal,
    });
    form.reset({
      ...form.getValues(),
      bayanNo: "",
      containerNumbers: Array.from({ length: data.containersCount }, () => ""),
      lastPulloutDateHijri: todayHijri(),
    });
    toast.success("Shipment added successfully", {
      description: `Bayan No ${data.bayanNo} for ${data.clientName}`,
      icon: <Ship className="h-4 w-4" />,
    });
  }

  function handleDeleteClient(name: string) {
    const client = clients.find((c) => c.name === name);
    if (!client) return;
    removeClient(client.id);
    form.setValue("clientName", "", { shouldValidate: false });
    toast.success("Client removed", {
      description: `${name} was removed from your client list`,
      icon: <Trash2 className="h-4 w-4" />,
    });
  }

  const exportToExcel = () => {
    if (shipments.length === 0) return;

    const rows = shipments.map((s) => ({
      "Bayan No": s.bayanNo,
      "Client's Name": s.clientName,
      "Type": s.shipmentType,
      "Containers": s.containersCount,
      "Container Numbers": getContainerNumbers(s).join(", "),
      "Last Pullout Date (Hijri)": getHijriDate(s),
      "Terminal": s.terminal,
      "Added": format(new Date(s.addedAt), "yyyy-MM-dd HH:mm"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shipments");
    const filename = `shipments-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const selectedClientLabel = form.watch("clientName");

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* Entry Form */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Ship className="h-5 w-5 text-primary" />
                  Log New Shipment
                </CardTitle>
                <CardDescription>Enter details for incoming terminal shipments</CardDescription>
              </div>
              <AddClientButton
                onSuccess={(name) => form.setValue("clientName", name, { shouldValidate: true })}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="bayanNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bayan No</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 10029384" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client's Name</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={clientPopoverOpen}
                                    disabled={clients.length === 0}
                                    className={cn(
                                      "w-full justify-between font-normal",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    <span className="truncate">
                                      {field.value ||
                                        (clients.length === 0
                                          ? "No clients yet — add one"
                                          : "Search & select client")}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="p-0"
                                style={{ width: "var(--radix-popover-trigger-width)" }}
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Type to search clients..." />
                                  <CommandList>
                                    <CommandEmpty>No matching client.</CommandEmpty>
                                    <CommandGroup>
                                      {clients.map((c) => (
                                        <CommandItem
                                          key={c.id}
                                          value={c.name}
                                          onSelect={(value) => {
                                            field.onChange(value);
                                            setClientPopoverOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === c.name ? "opacity-100" : "opacity-0",
                                            )}
                                          />
                                          {c.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40 disabled:opacity-40"
                            disabled={!selectedClientLabel}
                            onClick={() => handleDeleteClient(selectedClientLabel)}
                            aria-label="Delete selected client"
                            title={
                              selectedClientLabel
                                ? `Remove client ${selectedClientLabel}`
                                : "Select a client to remove"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LCL">LCL (Less than Container)</SelectItem>
                            <SelectItem value="FCL">FCL (Full Container)</SelectItem>
                            <SelectItem value="AIR">AIR (Air Freight)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="containersCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Containers (1-20)</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select count" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={String(num)}>
                                {num}
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
                    name="terminal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terminal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select terminal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="RSGT">RSGT (Red Sea Gateway)</SelectItem>
                            <SelectItem value="DP">DP World</SelectItem>
                            <SelectItem value="MAW">MAW (Mawani)</SelectItem>
                            <SelectItem value="SAL">SAL (Saudi Arabian Logistics)</SelectItem>
                            <SelectItem value="SATS">SATS (Saudi Arabia Terminal Services)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastPulloutDateHijri"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Last Pullout Date (Hijri)</FormLabel>
                        <FormControl>
                          <DatePicker
                            calendar={arabic}
                            locale={arabic_en}
                            format={HIJRI_FORMAT}
                            value={field.value || ""}
                            onChange={(date) => {
                              if (date instanceof DateObject) {
                                field.onChange(date.format(HIJRI_FORMAT));
                              } else {
                                field.onChange("");
                              }
                            }}
                            placeholder="Select Hijri date"
                            inputClass="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            containerClassName="w-full"
                            portal
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dynamic container number inputs */}
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Container Numbers</h3>
                      <p className="text-xs text-muted-foreground">
                        Enter {containersCount} container {containersCount === 1 ? "number" : "numbers"} for this shipment
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: containersCount }, (_, i) => (
                      <FormField
                        key={i}
                        control={form.control}
                        name={`containerNumbers.${i}` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Container {i + 1}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={`MSKU000000${(i + 1) % 10}`}
                                className="uppercase font-mono text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/40">
                  <Button type="submit" className="min-w-[150px]">
                    Log Shipment
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
              <CardTitle className="text-lg font-semibold">Active Shipments</CardTitle>
              <CardDescription className="mt-1">Recent entries logged in the system</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={shipments.length === 0}
              className="gap-2 bg-background"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export to Excel
            </Button>
          </div>

          <div className="overflow-x-auto">
            {shipments.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Ship className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No shipments logged</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Shipments you add will appear here. Start by filling out the form above.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Bayan No</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Containers</TableHead>
                    <TableHead className="font-semibold">Container Numbers</TableHead>
                    <TableHead className="font-semibold">Terminal</TableHead>
                    <TableHead className="font-semibold">Pullout (Hijri)</TableHead>
                    <TableHead className="font-semibold text-right">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const containerNums = getContainerNumbers(shipment);
                    const containersText = containerNums.length > 0 ? containerNums.join(", ") : "—";
                    const hijri = getHijriDate(shipment);
                    return (
                      <TableRow key={shipment.id} className="group">
                        <TableCell className="font-medium text-foreground">{shipment.bayanNo}</TableCell>
                        <TableCell>{shipment.clientName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            {shipment.shipmentType}
                          </span>
                        </TableCell>
                        <TableCell>{shipment.containersCount}</TableCell>
                        <TableCell className="uppercase font-mono text-xs max-w-[260px]">
                          <span className="block truncate" title={containersText}>
                            {containersText}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20">
                            {shipment.terminal}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{hijri || "—"}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(shipment.addedAt), { addSuffix: true })}
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
