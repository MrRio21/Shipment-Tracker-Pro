import { useState, useEffect } from 'react';

export interface Client {
  id: string;
  name: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-clients";

export function useClients() {
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch (error) {
      console.error(error);
    }
  }, [clients]);

  const addClient = (name: string) => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      addedAt: new Date().toISOString()
    };
    setClients(prev => [newClient, ...prev]);
  };

  return {
    clients,
    addClient
  };
}
