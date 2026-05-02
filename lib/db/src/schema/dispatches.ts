import { pgTable, uuid, varchar, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dispatchesTable = pgTable("dispatches", {
  id: uuid("id").primaryKey().defaultRandom(),
  containerNumber: varchar("container_number", { length: 100 }).notNull(),
  driverId: uuid("driver_id"),
  truckId: uuid("truck_id"),
  entryTime: timestamp("entry_time").notNull(),
  cargoDeliveryDate: date("cargo_delivery_date"),
  emptyReturnDate: date("empty_return_date"),
  returnedAt: timestamp("returned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDispatchSchema = createInsertSchema(dispatchesTable).omit({
  id: true,
  createdAt: true,
  returnedAt: true,
});

export type InsertDispatch = z.infer<typeof insertDispatchSchema>;
export type Dispatch = typeof dispatchesTable.$inferSelect;
