import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { contacts, vehicles } from "../schema.js";

export async function listOwnerVehicles(ownerId, page, limit) {
  return db
    .select()
    .from(vehicles)
    .where(eq(vehicles.ownerId, ownerId))
    .orderBy(desc(vehicles.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function insertVehicle(ownerId, values, qrToken) {
  const [vehicle] = await db
    .insert(vehicles)
    .values({ ...values, ownerId, qrToken })
    .returning();
  return vehicle;
}

export async function findOwnedVehicle(id, ownerId) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.ownerId, ownerId)))
    .limit(1);
  return vehicle;
}

export async function listVehicleContacts(vehicleId) {
  return db.select().from(contacts).where(eq(contacts.vehicleId, vehicleId));
}

export async function updateOwnedVehicle(id, ownerId, values) {
  const [vehicle] = await db
    .update(vehicles)
    .set(values)
    .where(and(eq(vehicles.id, id), eq(vehicles.ownerId, ownerId)))
    .returning();
  return vehicle;
}

export async function deactivateOwnedVehicle(id, ownerId) {
  const [vehicle] = await db
    .update(vehicles)
    .set({ status: "INACTIVE" })
    .where(and(eq(vehicles.id, id), eq(vehicles.ownerId, ownerId)))
    .returning({ id: vehicles.id });
  return vehicle;
}

export async function listOwnerContacts(ownerId) {
  const rows = await db
    .select({ contact: contacts, vehicle: vehicles })
    .from(contacts)
    .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
    .where(eq(vehicles.ownerId, ownerId));
  return rows.map((row) => ({
    ...row.contact,
    vehicleRegistration: row.vehicle.registrationNumber,
  }));
}

export async function insertContactWithinVehicleLimit(vehicleId, values) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select id from vehicles where id=${vehicleId} for update`,
    );
    const currentContacts = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.vehicleId, vehicleId));
    if (currentContacts.length >= 2) return { limitReached: true };

    const [contact] = await tx
      .insert(contacts)
      .values({ vehicleId, ...values })
      .returning();
    return { contact };
  });
}

export async function findOwnedContact(id, ownerId) {
  const [row] = await db
    .select({ contact: contacts, ownerId: vehicles.ownerId })
    .from(contacts)
    .innerJoin(vehicles, eq(contacts.vehicleId, vehicles.id))
    .where(and(eq(contacts.id, id), eq(vehicles.ownerId, ownerId)))
    .limit(1);
  return row || null;
}

export async function updateContact(id, values) {
  const [contact] = await db
    .update(contacts)
    .set(values)
    .where(eq(contacts.id, id))
    .returning();
  return contact;
}

export async function removeContact(id) {
  await db.delete(contacts).where(eq(contacts.id, id));
}
