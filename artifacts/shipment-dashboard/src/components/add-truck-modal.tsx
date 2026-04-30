import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Truck as TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTrucks } from "@/hooks/use-trucks";

const addTruckSchema = z.object({
  model: z.string().min(1, { message: "Truck model is required" }),
  plateNumber: z.string().min(1, { message: "Plate number is required" }),
});

type AddTruckFormValues = z.infer<typeof addTruckSchema>;

interface AddTruckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function AddTruckModal({ open, onOpenChange, onSuccess }: AddTruckModalProps) {
  const { addTruck } = useTrucks();
  const form = useForm<AddTruckFormValues>({
    resolver: zodResolver(addTruckSchema),
    defaultValues: { model: "", plateNumber: "" },
  });

  function onSubmit(data: AddTruckFormValues) {
    const id = addTruck(data);
    toast.success("Truck added successfully", {
      description: `${data.model} — ${data.plateNumber} has been registered`,
      icon: <TruckIcon className="h-4 w-4" />,
    });
    form.reset();
    onOpenChange(false);
    onSuccess?.(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Truck</DialogTitle>
          <DialogDescription>
            Register a new truck for dispatch assignments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Truck Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Volvo FH16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1234 ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" className="min-w-[100px]">Save Truck</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AddTruckButtonProps {
  onSuccess?: (id: string) => void;
  iconOnly?: boolean;
}

export function AddTruckButton({ onSuccess, iconOnly }: AddTruckButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Add new truck"
          title="Add new truck"
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      )}
      <AddTruckModal open={open} onOpenChange={setOpen} onSuccess={onSuccess} />
    </>
  );
}
