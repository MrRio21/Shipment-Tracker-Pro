import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./use-api";

export interface Truck {
  id: string;
  model: string;
  plateNumber: string;
  createdAt: string;
}

export function useTrucks() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Truck[]>("/trucks");
      setTrucks(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTruck = useCallback(
    async (data: { model: string; plateNumber: string }): Promise<Truck> => {
      const truck = await apiFetch<Truck>("/trucks", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setTrucks((prev) => [truck, ...prev]);
      return truck;
    },
    [],
  );

  const removeTruck = useCallback(async (id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { trucks, isLoading, addTruck, removeTruck, refresh };
}
