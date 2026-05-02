import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/use-clients";

const addClientSchema = z.object({
  name: z.string().min(1, { message: "Client Name is required" }),
});

type AddClientFormValues = z.infer<typeof addClientSchema>;

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (name: string) => void;
}

export function AddClientModal({ open, onOpenChange, onSuccess }: AddClientModalProps) {
  const { addClient } = useClients();
  const [saving, setSaving] = useState(false);
  const form = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: AddClientFormValues) {
    setSaving(true);
    try {
      const client = await addClient(data.name);
      toast.success("Client added successfully", {
        description: `${client.name} has been registered`,
        icon: <Users className="h-4 w-4" />,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.(client.name);
    } catch (err) {
      toast.error("Failed to add client", {
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
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Register a new client for shipments.</DialogDescription>
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
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} disabled={saving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" className="min-w-[100px]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddClientButton({ onSuccess }: { onSuccess?: (name: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" />
        Add
      </Button>
      <AddClientModal open={open} onOpenChange={setOpen} onSuccess={onSuccess} />
    </>
  );
}
