import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./use-api";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addDriver = useCallback(
    async (data: { name: string; phone: string }): Promise<Driver> => {
      const driver = await apiFetch<Driver>("/drivers", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setDrivers((prev) => [driver, ...prev]);
      return driver;
    },
    [],
  );

  return { drivers, isLoading, addDriver, refresh };
}
