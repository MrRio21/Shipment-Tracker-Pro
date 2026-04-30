import { useState, useEffect } from 'react';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  addedAt: string;
}

const STORAGE_KEY = "shipment-drivers";

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
    } catch (error) {
      console.error(error);
    }
  }, [drivers]);

  const addDriver = (data: { name: string; phone: string }) => {
    const newDriver: Driver = {
      id: crypto.randomUUID(),
      name: data.name,
      phone: data.phone,
      addedAt: new Date().toISOString()
    };
    setDrivers(prev => [newDriver, ...prev]);
  };

  return {
    drivers,
    addDriver
  };
}
