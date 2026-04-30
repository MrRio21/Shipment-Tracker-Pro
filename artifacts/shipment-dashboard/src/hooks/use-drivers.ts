import { useLocalStorageState } from "./use-local-storage-state";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-drivers";
const EMPTY: Driver[] = [];

export function useDrivers() {
  const [drivers, setDrivers] = useLocalStorageState<Driver[]>(STORAGE_KEY, EMPTY);

  const addDriver = (data: { name: string; phone: string }) => {
    setDrivers((prev) => [
      {
        id: crypto.randomUUID(),
        name: data.name,
        phone: data.phone,
        addedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return { drivers, addDriver };
}
