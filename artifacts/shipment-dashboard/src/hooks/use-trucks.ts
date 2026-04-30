import { useLocalStorageState } from "./use-local-storage-state";

export interface Truck {
  id: string;
  model: string;
  plateNumber: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-trucks";
const EMPTY: Truck[] = [];

export function useTrucks() {
  const [trucks, setTrucks] = useLocalStorageState<Truck[]>(STORAGE_KEY, EMPTY);

  const addTruck = (data: { model: string; plateNumber: string }): string => {
    const id = crypto.randomUUID();
    setTrucks((prev) => [
      {
        id,
        model: data.model,
        plateNumber: data.plateNumber,
        addedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    return id;
  };

  const removeTruck = (id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
  };

  return { trucks, addTruck, removeTruck };
}
