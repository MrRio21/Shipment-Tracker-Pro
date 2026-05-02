import { Router } from "express";
import { db, trucksTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const trucks = await db
    .select()
    .from(trucksTable)
    .orderBy(desc(trucksTable.createdAt));
  res.json(trucks);
});

router.post("/", async (req, res) => {
  const { model, plateNumber } = req.body as {
    model?: string;
    plateNumber?: string;
  };
  if (!model?.trim() || !plateNumber?.trim()) {
    res.status(400).json({ error: "Model and plate number are required" });
    return;
  }
  const [truck] = await db
    .insert(trucksTable)
    .values({ model: model.trim(), plateNumber: plateNumber.trim() })
    .returning();
  res.status(201).json(truck);
});

export default router;
