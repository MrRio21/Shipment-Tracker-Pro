import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "./use-api";

export type ShipmentType = "LCL" | "FCL" | "AIR";
export type Terminal = "RSGT" | "DP" | "MAW" | "SAL" | "SATS";

export interface Shipment {
  id: string;
  bayanNo: string;
  clientId: string | null;
  clientName: string;
  shipmentType: string;
  containersCount: number;
  containerNumber: string;
  terminal: string;
  lastPulloutDateHijri: string;
  createdAt: string;
}

export interface AddShipmentPayload {
  bayanNo: string;
  clientId?: string;
  clientName: string;
  shipmentType: string;
  containersCount: number;
  containerNumber: string;
  terminal: string;
  lastPulloutDateHijri: string;
}

export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Shipment[]>("/shipments");
      setShipments(data);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addShipment = useCallback(
    async (payload: AddShipmentPayload): Promise<Shipment> => {
      const shipment = await apiFetch<Shipment>("/shipments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setShipments((prev) => [shipment, ...prev]);
      return shipment;
    },
    [],
  );

  const removeShipment = useCallback(async (id: string) => {
    await apiFetch(`/shipments/${id}`, { method: "DELETE" });
    setShipments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { shipments, isLoading, addShipment, removeShipment, refresh };
}

// Helpers kept for backward-compat with table render code
export function getContainerNumbers(s: Shipment): string[] {
  return s.containerNumber ? [s.containerNumber] : [];
}

export function getHijriDate(s: Shipment): string {
  return s.lastPulloutDateHijri || "";
}
