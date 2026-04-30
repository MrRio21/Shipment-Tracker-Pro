import { useState, useEffect } from 'react';

export type ShipmentType = "LCL" | "FCL" | "AIR";
export type Terminal = "RSGT" | "DP" | "MAW" | "SAL" | "SATS";

export interface Shipment {
  id: string;
  bayanNo: string;
  clientName: string;
  shipmentType: ShipmentType;
  containersCount: number;
  containerNumber: string;
  lastPulloutDate: string;
  terminal: Terminal;
  addedAt: string;
}

const STORAGE_KEY = "shipment-entries";

export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>(() => {
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
    } catch (error) {
      console.error(error);
    }
  }, [shipments]);

  const addShipment = (shipment: Omit<Shipment, "id" | "addedAt">) => {
    const newShipment: Shipment = {
      ...shipment,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString()
    };
    setShipments(prev => [newShipment, ...prev]);
  };

  return {
    shipments,
    addShipment
  };
}
