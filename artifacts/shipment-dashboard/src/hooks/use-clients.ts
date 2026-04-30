import { useLocalStorageState } from "./use-local-storage-state";

export interface Client {
  id: string;
  name: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-clients";
const EMPTY: Client[] = [];

export function useClients() {
  const [clients, setClients] = useLocalStorageState<Client[]>(STORAGE_KEY, EMPTY);

  const addClient = (name: string) => {
    setClients((prev) => [
      { id: crypto.randomUUID(), name, addedAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  return { clients, addClient };
}
