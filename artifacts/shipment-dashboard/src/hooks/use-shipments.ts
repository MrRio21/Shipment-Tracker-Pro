import { useLocalStorageState } from "./use-local-storage-state";

export type ShipmentType = "LCL" | "FCL" | "AIR";
export type Terminal = "RSGT" | "DP" | "MAW" | "SAL" | "SATS";

export interface Shipment {
  id: string;
  bayanNo: string;
  clientName: string;
  shipmentType: ShipmentType;
  containersCount: number;
  containerNumbers: string[];
  lastPulloutDateHijri: string;
  terminal: Terminal;
  addedAt: string;
  // Legacy fields kept for backward compatibility with previously stored records
  containerNumber?: string;
  lastPulloutDate?: string;
  hijriDate?: string;
}

const STORAGE_KEY = "shipment-entries";
const EMPTY: Shipment[] = [];

export function useShipments() {
  const [shipments, setShipments] = useLocalStorageState<Shipment[]>(STORAGE_KEY, EMPTY);

  const addShipment = (data: Omit<Shipment, "id" | "addedAt">) => {
    setShipments((prev) => [
      { ...data, id: crypto.randomUUID(), addedAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  return { shipments, addShipment };
}

export function getContainerNumbers(s: Shipment): string[] {
  if (Array.isArray(s.containerNumbers) && s.containerNumbers.length > 0) {
    return s.containerNumbers.filter(Boolean);
  }
  if (s.containerNumber) return [s.containerNumber];
  return [];
}

export function getHijriDate(s: Shipment): string {
  return s.lastPulloutDateHijri || s.hijriDate || "";
}
