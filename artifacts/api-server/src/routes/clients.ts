import { Router } from "express";
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const clients = await db
    .select()
    .from(clientsTable)
    .orderBy(desc(clientsTable.createdAt));
  res.json(clients);
});

router.post("/", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [client] = await db
    .insert(clientsTable)
    .values({ name: name.trim() })
    .returning();
  res.status(201).json(client);
});

router.delete("/:id", async (req, res) => {
  await db.delete(clientsTable).where(eq(clientsTable.id, String(req.params.id)));
  res.json({ ok: true });
});

export default router;
