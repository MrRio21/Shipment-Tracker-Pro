import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShipments } from "@/hooks/use-shipments";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Anchor, LogOut, Download, FileSpreadsheet, Ship } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const shipmentSchema = z.object({
  bayanNo: z.string().min(1, { message: "Bayan No is required" }),
  clientName: z.string().min(1, { message: "Client Name is required" }),
  shipmentType: z.enum(["LCL", "FCL", "AIR"], { required_error: "Type is required" }),
  containersCount: z.coerce.number().min(1).max(20),
  containerNumber: z.string().min(1, { message: "Container Number is required" }),
  lastPulloutDate: z.string().min(1, { message: "Date is required" }),
  terminal: z.enum(["RSGT", "DP", "MAW"], { required_error: "Terminal is required" }),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { shipments, addShipment } = useShipments();

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
      containerNumber: "",
      lastPulloutDate: format(new Date(), "yyyy-MM-dd"),
      terminal: "RSGT",
    },
  });

  if (!isAuthenticated) return null;

  function onSubmit(data: ShipmentFormValues) {
    addShipment(data);
    form.reset({
      ...form.getValues(),
      bayanNo: "",
      containerNumber: "",
      // Keep other defaults for ease of sequential data entry
    });
    toast.success("Shipment added successfully", {
      description: `Bayan No ${data.bayanNo} for ${data.clientName}`,
      icon: <Ship className="h-4 w-4" />,
    });
  }

  const exportToExcel = () => {
    if (shipments.length === 0) return;
    
    const rows = shipments.map(s => ({
      "Bayan No": s.bayanNo,
      "Client's Name": s.clientName,
      "Type": s.shipmentType,
      "Containers": s.containersCount,
      "Container Number": s.containerNumber,
      "Last Pullout Date": s.lastPulloutDate,
      "Terminal": s.terminal,
      "Added": format(new Date(s.addedAt), "yyyy-MM-dd HH:mm")
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    const filename = `shipments-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Anchor className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground leading-tight tracking-tight">PortLogistics</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Operations Console</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              admin@example.com
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Entry Form */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Log New Shipment
            </CardTitle>
            <CardDescription>Enter details for incoming terminal shipments</CardDescription>
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
                        <FormControl>
                          <Input placeholder="Company LLC" {...field} />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select count" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                              <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="containerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Container Number</FormLabel>
                        <FormControl>
                          <Input placeholder="MSKU1234567" className="uppercase" {...field} />
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
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastPulloutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Pullout Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    <TableHead className="font-semibold">Container #</TableHead>
                    <TableHead className="font-semibold">Terminal</TableHead>
                    <TableHead className="font-semibold">Pullout Date</TableHead>
                    <TableHead className="font-semibold text-right">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="group">
                      <TableCell className="font-medium text-foreground">{shipment.bayanNo}</TableCell>
                      <TableCell>{shipment.clientName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {shipment.shipmentType}
                        </span>
                      </TableCell>
                      <TableCell>{shipment.containersCount}</TableCell>
                      <TableCell className="uppercase font-mono text-xs">{shipment.containerNumber}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20">
                          {shipment.terminal}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(shipment.lastPulloutDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                        {formatDistanceToNow(new Date(shipment.addedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
