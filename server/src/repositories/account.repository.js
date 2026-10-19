import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { users } from "../schema.js";

const publicAccountFields = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  phoneVerified: users.phoneVerified,
  role: users.role,
  isActive: users.isActive,
};

export async function insertAccount(values) {
  const [account] = await db
    .insert(users)
    .values(values)
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
    });
  return account;
}

export async function findAccountForLogin(email) {
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return account;
}

export async function findAccountWithPassword(id) {
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return account;
}

export async function markAccountPhoneVerified(id) {
  const [account] = await db
    .update(users)
    .set({ phoneVerified: true })
    .where(eq(users.id, id))
    .returning(publicAccountFields);
  return account;
}

export async function updateAccountProfile(id, values) {
  const [account] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning(publicAccountFields);
  return account;
}

export async function saveAccountPassword(id, passwordHash) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}
