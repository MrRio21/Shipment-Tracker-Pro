import { Router } from "express";
import { db, dispatchesTable, driversTable, trucksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const dispatches = await db
    .select()
    .from(dispatchesTable)
    .orderBy(desc(dispatchesTable.createdAt));

  // Join driver and truck data
  const driverIds = [...new Set(dispatches.map((d) => d.driverId).filter(Boolean))] as string[];
  const truckIds = [...new Set(dispatches.map((d) => d.truckId).filter(Boolean))] as string[];

  const [drivers, trucks] = await Promise.all([
    driverIds.length > 0
      ? db.select().from(driversTable)
      : Promise.resolve([]),
    truckIds.length > 0
      ? db.select().from(trucksTable)
      : Promise.resolve([]),
  ]);

  const driversMap = Object.fromEntries(drivers.map((d) => [d.id, d]));
  const trucksMap = Object.fromEntries(trucks.map((t) => [t.id, t]));

  const enriched = dispatches.map((d) => ({
    ...d,
    driver: d.driverId ? driversMap[d.driverId] ?? null : null,
    truck: d.truckId ? trucksMap[d.truckId] ?? null : null,
  }));

  res.json(enriched);
});

router.post("/", async (req, res) => {
  const {
    containerNumber,
    driverId,
    truckId,
    entryTime,
    cargoDeliveryDate,
    emptyReturnDate,
  } = req.body as {
    containerNumber?: string;
    driverId?: string;
    truckId?: string;
    entryTime?: string;
    cargoDeliveryDate?: string;
    emptyReturnDate?: string;
  };

  if (!containerNumber?.trim() || !driverId || !truckId || !entryTime) {
    res.status(400).json({ error: "Missing required dispatch fields" });
    return;
  }

  const [dispatch] = await db
    .insert(dispatchesTable)
    .values({
      containerNumber: containerNumber.trim().toUpperCase(),
      driverId,
      truckId,
      entryTime: new Date(entryTime),
      cargoDeliveryDate: cargoDeliveryDate || null,
      emptyReturnDate: emptyReturnDate || null,
    })
    .returning();

  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.id, driverId))
    .limit(1);
  const [truck] = await db
    .select()
    .from(trucksTable)
    .where(eq(trucksTable.id, truckId))
    .limit(1);

  res.status(201).json({ ...dispatch, driver: driver ?? null, truck: truck ?? null });
});

router.delete("/:id", async (req, res) => {
  const [deleted] = await db
    .delete(dispatchesTable)
    .where(eq(dispatchesTable.id, String(req.params.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Dispatch not found" });
    return;
  }
  res.json({ ok: true });
});

router.patch("/:id/return", requireAuth, async (req, res) => {
  const [dispatch] = await db
    .update(dispatchesTable)
    .set({ returnedAt: new Date() })
    .where(eq(dispatchesTable.id, String(req.params.id)))
    .returning();

  if (!dispatch) {
    res.status(404).json({ error: "Dispatch not found" });
    return;
  }

  res.json(dispatch);
});

export default router;
