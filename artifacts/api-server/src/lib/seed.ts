import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_ADMIN_EMAIL = "admin@globalsail.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function seedDefaultAdmin() {
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, DEFAULT_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      logger.info("Default admin user already exists, skipping seed");
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await db.insert(usersTable).values({
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    });

    logger.info(
      { email: DEFAULT_ADMIN_EMAIL },
      "Default admin user seeded successfully",
    );
  } catch (err) {
    logger.error({ err }, "Failed to seed default admin user");
  }
}
