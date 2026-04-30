import { useState, useEffect } from 'react';

export interface Dispatch {
  id: string;
  containerNumber: string;
  driverId: string;
  truckInfo: string;
  entryTime: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-dispatches";

export function useDispatches() {
  const [dispatches, setDispatches] = useState<Dispatch[]>(() => {
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dispatches));
    } catch (error) {
      console.error(error);
    }
  }, [dispatches]);

  const addDispatch = (dispatch: Omit<Dispatch, "id" | "addedAt">) => {
    const newDispatch: Dispatch = {
      ...dispatch,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString()
    };
    setDispatches(prev => [newDispatch, ...prev]);
  };

  return {
    dispatches,
    addDispatch
  };
}
