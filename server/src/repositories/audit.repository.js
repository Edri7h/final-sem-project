import { db } from "../db.js";
import { auditLogs } from "../schema.js";

export async function appendAuditLog(userId, action, entity, entityId, metadata = {}) {
  await db.insert(auditLogs).values({
    userId,
    action,
    entity,
    entityId,
    metadata,
  });
}
