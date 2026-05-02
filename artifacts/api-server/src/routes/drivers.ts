import { Router } from "express";
import { db, driversTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const drivers = await db
    .select()
    .from(driversTable)
    .orderBy(desc(driversTable.createdAt));
  res.json(drivers);
});

router.post("/", async (req, res) => {
  const { name, phone } = req.body as { name?: string; phone?: string };
  if (!name?.trim() || !phone?.trim()) {
    res.status(400).json({ error: "Name and phone are required" });
    return;
  }
  const [driver] = await db
    .insert(driversTable)
    .values({ name: name.trim(), phone: phone.trim() })
    .returning();
  res.status(201).json(driver);
});

export default router;
