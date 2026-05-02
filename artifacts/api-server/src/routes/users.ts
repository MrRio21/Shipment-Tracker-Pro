import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.post("/", async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: string;
  };

  if (!email?.trim() || !password || password.length < 6) {
    res.status(400).json({
      error: "Valid email and password (min 6 chars) are required",
    });
    return;
  }

  const validRoles = ["admin", "operator"];
  const userRole = validRoles.includes(role ?? "") ? role! : "operator";

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        role: userRole,
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ error: "A user with this email already exists" });
  }
});

export default router;
