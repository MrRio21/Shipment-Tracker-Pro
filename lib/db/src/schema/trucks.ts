import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trucksTable = pgTable("trucks", {
  id: uuid("id").primaryKey().defaultRandom(),
  model: varchar("model", { length: 255 }).notNull(),
  plateNumber: varchar("plate_number", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTruckSchema = createInsertSchema(trucksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucksTable.$inferSelect;
