import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { phoneVerifications } from "../schema.js";

export async function savePhoneVerification(record) {
  const values = {
    ...record,
    attempts: 0,
    createdAt: new Date(),
  };
  await db
    .insert(phoneVerifications)
    .values(values)
    .onConflictDoUpdate({
      target: [phoneVerifications.subjectType, phoneVerifications.subjectId],
      set: {
        phone: values.phone,
        codeHash: values.codeHash,
        expiresAt: values.expiresAt,
        attempts: 0,
        createdAt: values.createdAt,
      },
    });
}

export async function consumePhoneVerification(subjectType, subjectId, phone, codeCheck) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.subjectType, subjectType),
          eq(phoneVerifications.subjectId, subjectId),
          eq(phoneVerifications.phone, phone),
        ),
      )
      .for("update")
      .limit(1);

    if (!record) return false;
    if (record.expiresAt <= new Date() || record.attempts >= 5) {
      await tx
        .delete(phoneVerifications)
        .where(eq(phoneVerifications.id, record.id));
      return false;
    }

    const valid = await codeCheck(record.codeHash);
    if (!valid) {
      await tx
        .update(phoneVerifications)
        .set({ attempts: sql`${phoneVerifications.attempts} + 1` })
        .where(eq(phoneVerifications.id, record.id));
      return false;
    }

    await tx
      .delete(phoneVerifications)
      .where(eq(phoneVerifications.id, record.id));
    return true;
  });
}
