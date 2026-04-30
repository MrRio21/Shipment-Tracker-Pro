import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShipments, getContainerNumbers, getHijriDate } from "@/hooks/use-shipments";
import { useClients } from "@/hooks/use-clients";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { FileSpreadsheet, Search, Ship, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/app-header";
import { AddClientButton } from "@/components/add-client-modal";
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_en from "react-date-object/locales/arabic_en";

const HIJRI_FORMAT = "DD MMMM YYYY";

const todayHijri = () =>
  new DateObject({ calendar: arabic, locale: arabic_en }).format(HIJRI_FORMAT);

const SHIPMENT_TYPE_OPTIONS = [
  { value: "LCL", label: "LCL (Less than Container)" },
  { value: "FCL", label: "FCL (Full Container)" },
  { value: "AIR", label: "AIR (Air Freight)" },
];

const TERMINAL_OPTIONS = [
  { value: "RSGT", label: "RSGT (Red Sea Gateway)" },
  { value: "DP", label: "DP World" },
  { value: "MAW", label: "MAW (Mawani)" },
  { value: "SAL", label: "SAL (Saudi Arabian Logistics)" },
  { value: "SATS", label: "SATS (Saudi Arabia Terminal Services)" },
];

const CONTAINERS_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

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
  const [shipmentsQuery, setShipmentsQuery] = useState("");

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

  const clientOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const c of clients) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      opts.push({ value: c.name, label: c.name });
    }
    return opts;
  }, [clients]);

  const filteredShipments = useMemo(() => {
    const q = shipmentsQuery.trim().toLowerCase();
    if (!q) return shipments;
    return shipments.filter((s) => {
      const haystack = [
        s.bayanNo,
        s.clientName,
        s.shipmentType,
        String(s.containersCount),
        ...getContainerNumbers(s),
        s.terminal,
        getHijriDate(s),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [shipments, shipmentsQuery]);

  if (!isAuthenticated) return null;

  function onSubmit(data: ShipmentFormValues) {
    // Split: one shipment record per container number.
    const numbers = data.containerNumbers.filter((n) => n.trim().length > 0);
    numbers.forEach((num) => {
      addShipment({
        bayanNo: data.bayanNo,
        clientName: data.clientName,
        shipmentType: data.shipmentType,
        containersCount: 1,
        containerNumbers: [num.trim()],
        lastPulloutDateHijri: data.lastPulloutDateHijri,
        terminal: data.terminal,
      });
    });

    form.reset({
      ...form.getValues(),
      bayanNo: "",
      containerNumbers: Array.from({ length: data.containersCount }, () => ""),
      lastPulloutDateHijri: todayHijri(),
    });

    const count = numbers.length;
    toast.success(
      count === 1 ? "Shipment added successfully" : `${count} shipments added successfully`,
      {
        description:
          count === 1
            ? `Bayan No ${data.bayanNo} for ${data.clientName}`
            : `Bayan No ${data.bayanNo} — ${count} containers logged as separate records`,
        icon: <Ship className="h-4 w-4" />,
      },
    );
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
    const rows = filteredShipments.map((s) => ({
      "Bayan No": s.bayanNo,
      "Client's Name": s.clientName,
      "Type": s.shipmentType,
      "Containers": s.containersCount,
      "Container Numbers": getContainerNumbers(s).join(", "),
      "Last Pullout Date (Hijri)": getHijriDate(s),
      "Terminal": s.terminal,
      "Added": format(new Date(s.addedAt), "yyyy-MM-dd HH:mm"),
    }));
    if (rows.length === 0) return;

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
                            <FormControl>
                              <Combobox
                                options={clientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={
                                  clientOptions.length === 0
                                    ? "No clients yet — add one"
                                    : "Search & select client"
                                }
                                searchPlaceholder="Type to search clients..."
                                emptyText="No matching client."
                                disabled={clientOptions.length === 0}
                              />
                            </FormControl>
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
                        <FormControl>
                          <Combobox
                            options={SHIPMENT_TYPE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select type"
                            searchPlaceholder="Search types..."
                          />
                        </FormControl>
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
                        <FormControl>
                          <Combobox
                            options={CONTAINERS_COUNT_OPTIONS}
                            value={String(field.value)}
                            onChange={(v) => field.onChange(Number(v))}
                            placeholder="Select count"
                            searchPlaceholder="Search count..."
                          />
                        </FormControl>
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
                        <FormControl>
                          <Combobox
                            options={TERMINAL_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select terminal"
                            searchPlaceholder="Search terminals..."
                          />
                        </FormControl>
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
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Container Numbers</h3>
                    <p className="text-xs text-muted-foreground">
                      Enter {containersCount} container {containersCount === 1 ? "number" : "numbers"} — each will be saved as its own shipment record
                    </p>
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
          <div className="flex flex-col gap-4 p-6 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold">Active Shipments</CardTitle>
                <CardDescription className="mt-1">
                  Recent entries logged in the system
                  {shipmentsQuery && (
                    <span className="ml-1 text-foreground">
                      · showing {filteredShipments.length} of {shipments.length}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={filteredShipments.length === 0}
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
                value={shipmentsQuery}
                onChange={(e) => setShipmentsQuery(e.target.value)}
                placeholder="Search by Bayan, client, container, terminal..."
                className="pl-9 bg-background"
              />
            </div>
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
            ) : filteredShipments.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-medium text-foreground">No matching shipments</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  No records match "{shipmentsQuery}". Try a different search term.
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
                  {filteredShipments.map((shipment) => {
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
