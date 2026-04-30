import { useLocalStorageState } from "./use-local-storage-state";

export interface Dispatch {
  id: string;
  containerNumber: string;
  driverId: string;
  truckInfo: string;
  entryTime: string;
  cargoDeliveryDate: string;
  emptyReturnDate: string;
  addedAt: string;
  returnedAt: string | null;
}

const STORAGE_KEY = "shipment-dispatches";
const EMPTY: Dispatch[] = [];

export function useDispatches() {
  const [dispatches, setDispatches] = useLocalStorageState<Dispatch[]>(
    STORAGE_KEY,
    EMPTY,
  );

  const addDispatch = (
    dispatch: Omit<Dispatch, "id" | "addedAt" | "returnedAt">,
  ) => {
    setDispatches((prev) => [
      {
        ...dispatch,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString(),
        returnedAt: null,
      },
      ...prev,
    ]);
  };

  const markReturned = (id: string) => {
    setDispatches((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, returnedAt: new Date().toISOString() } : d,
      ),
    );
  };

  return { dispatches, addDispatch, markReturned };
}
