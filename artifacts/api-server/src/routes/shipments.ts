import { Router } from "express";
import { db, shipmentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const shipments = await db
    .select()
    .from(shipmentsTable)
    .orderBy(desc(shipmentsTable.createdAt));
  res.json(shipments);
});

router.post("/", async (req, res) => {
  const {
    bayanNo,
    clientId,
    clientName,
    shipmentType,
    containersCount,
    containerNumber,
    terminal,
    lastPulloutDateHijri,
  } = req.body as {
    bayanNo?: string;
    clientId?: string;
    clientName?: string;
    shipmentType?: string;
    containersCount?: number;
    containerNumber?: string;
    terminal?: string;
    lastPulloutDateHijri?: string;
  };

  if (
    !bayanNo?.trim() ||
    !clientName?.trim() ||
    !shipmentType ||
    !containerNumber?.trim() ||
    !terminal ||
    !lastPulloutDateHijri
  ) {
    res.status(400).json({ error: "Missing required shipment fields" });
    return;
  }

  const [shipment] = await db
    .insert(shipmentsTable)
    .values({
      bayanNo: bayanNo.trim(),
      clientId: clientId || null,
      clientName: clientName.trim(),
      shipmentType,
      containersCount: containersCount ?? 1,
      containerNumber: containerNumber.trim().toUpperCase(),
      terminal,
      lastPulloutDateHijri,
    })
    .returning();

  res.status(201).json(shipment);
});

router.delete("/:id", async (req, res) => {
  const [deleted] = await db
    .delete(shipmentsTable)
    .where(eq(shipmentsTable.id, String(req.params.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
