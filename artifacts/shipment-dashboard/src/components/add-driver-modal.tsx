import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useDrivers } from "@/hooks/use-drivers";

const addDriverSchema = z.object({
  name: z.string().min(1, { message: "Driver Name is required" }),
  phone: z.string().min(1, { message: "Phone Number is required" }),
});

type AddDriverFormValues = z.infer<typeof addDriverSchema>;

interface AddDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function AddDriverModal({ open, onOpenChange, onSuccess }: AddDriverModalProps) {
  const { addDriver } = useDrivers();
  const [saving, setSaving] = useState(false);
  const form = useForm<AddDriverFormValues>({
    resolver: zodResolver(addDriverSchema),
    defaultValues: { name: "", phone: "" },
  });

  async function onSubmit(data: AddDriverFormValues) {
    setSaving(true);
    try {
      const driver = await addDriver(data);
      toast.success("Driver added successfully", {
        description: `${driver.name} has been registered`,
        icon: <User className="h-4 w-4" />,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.(driver.id);
    } catch (err) {
      toast.error("Failed to add driver", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
          <DialogDescription>Register a new driver for dispatches.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.stopPropagation();
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter driver name" {...field} disabled={saving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +966 50 123 4567" {...field} disabled={saving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" className="min-w-[100px]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Driver"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddDriverButton({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Driver
      </Button>
      <AddDriverModal open={open} onOpenChange={setOpen} onSuccess={onSuccess} />
    </>
  );
}
