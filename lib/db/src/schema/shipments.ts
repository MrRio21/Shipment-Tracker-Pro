import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipmentsTable = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bayanNo: varchar("bayan_no", { length: 100 }).notNull(),
  clientId: uuid("client_id"),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  shipmentType: varchar("shipment_type", { length: 10 }).notNull(),
  containersCount: integer("containers_count").notNull().default(1),
  containerNumber: varchar("container_number", { length: 100 }).notNull(),
  terminal: varchar("terminal", { length: 50 }).notNull(),
  lastPulloutDateHijri: varchar("last_pullout_date_hijri", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
