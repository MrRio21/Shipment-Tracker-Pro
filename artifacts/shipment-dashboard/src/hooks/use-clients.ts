import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./use-api";

export interface Client {
  id: string;
  name: string;
  createdAt: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Client[]>("/clients");
      setClients(data);
    } catch {
      // silently ignore auth errors (page will redirect)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addClient = useCallback(
    async (name: string): Promise<Client> => {
      const client = await apiFetch<Client>("/clients", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setClients((prev) => [client, ...prev]);
      return client;
    },
    [],
  );

  const removeClient = useCallback(async (id: string) => {
    await apiFetch(`/clients/${id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { clients, isLoading, addClient, removeClient, refresh };
}
