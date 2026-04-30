import { useLocalStorageState } from "./use-local-storage-state";

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
  hijriDate: string;
  terminal: Terminal;
  addedAt: string;
}

const STORAGE_KEY = "shipment-entries";
const EMPTY: Shipment[] = [];

export function useShipments() {
  const [shipments, setShipments] = useLocalStorageState<Shipment[]>(
    STORAGE_KEY,
    EMPTY,
  );

  const addShipment = (shipment: Omit<Shipment, "id" | "addedAt">) => {
    setShipments((prev) => [
      {
        ...shipment,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return { shipments, addShipment };
}
