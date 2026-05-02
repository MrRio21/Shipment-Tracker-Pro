import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./use-api";
import type { Driver } from "./use-drivers";
import type { Truck } from "./use-trucks";

export interface Dispatch {
  id: string;
  containerNumber: string;
  driverId: string | null;
  truckId: string | null;
  entryTime: string;
  cargoDeliveryDate: string | null;
  emptyReturnDate: string | null;
  returnedAt: string | null;
  createdAt: string;
  driver: Driver | null;
  truck: Truck | null;
}

export interface AddDispatchPayload {
  containerNumber: string;
  driverId: string;
  truckId: string;
  entryTime: string;
  cargoDeliveryDate?: string;
  emptyReturnDate?: string;
}

export function useDispatches() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Dispatch[]>("/dispatches");
      setDispatches(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addDispatch = useCallback(
    async (payload: AddDispatchPayload): Promise<Dispatch> => {
      const dispatch = await apiFetch<Dispatch>("/dispatches", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDispatches((prev) => [dispatch, ...prev]);
      return dispatch;
    },
    [],
  );

  const markReturned = useCallback(async (id: string) => {
    const updated = await apiFetch<Dispatch>(`/dispatches/${id}/return`, {
      method: "PATCH",
    });
    setDispatches((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d)),
    );
  }, []);

  const removeDispatch = useCallback(async (id: string) => {
    await apiFetch(`/dispatches/${id}`, { method: "DELETE" });
    setDispatches((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { dispatches, isLoading, addDispatch, markReturned, removeDispatch, refresh };
}
