import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  numeric,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const vehicleStatus = pgEnum("vehicle_status", ["ACTIVE", "INACTIVE"]);
export const alertStatus = pgEnum("alert_status", ["OPEN", "ACKNOWLEDGED", "RESOLVED"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  role: roleEnum("role").notNull().default("USER"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    registrationNumber: varchar("registration_number", { length: 20 }).notNull(),
    make: varchar("make", { length: 80 }).notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    color: varchar("color", { length: 40 }).notNull(),
    description: text("description"),
    status: vehicleStatus("status").notNull().default("ACTIVE"),
    qrToken: varchar("qr_token", { length: 80 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicles_owner_idx").on(table.ownerId),
    uniqueIndex("vehicles_registration_owner_unique").on(
      table.ownerId,
      table.registrationNumber,
    ),
  ],
);

export const contacts = pgTable(
  "emergency_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    relationship: varchar("relationship", { length: 60 }),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contacts_vehicle_idx").on(table.vehicleId)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    type: varchar("type", { length: 40 }).notNull(),
    description: varchar("description", { length: 500 }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    locationAccuracy: numeric("location_accuracy", { precision: 10, scale: 2 }),
    status: alertStatus("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("alerts_vehicle_idx").on(table.vehicleId),
    index("alerts_created_idx").on(table.createdAt),
    index("alerts_status_idx").on(table.status),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alertId: uuid("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    destination: varchar("destination", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    providerSid: varchar("provider_sid", { length: 80 }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_status_idx").on(table.status),
    index("notifications_alert_idx").on(table.alertId, table.createdAt),
  ],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 80 }),
  entityId: varchar("entity_id", { length: 80 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phoneVerifications = pgTable(
  "phone_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectType: varchar("subject_type", { length: 20 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("phone_verifications_subject_unique").on(
      table.subjectType,
      table.subjectId,
    ),
    index("phone_verifications_phone_idx").on(table.phone),
  ],
);

export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alertId: uuid("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("alert_events_alert_idx").on(table.alertId, table.createdAt)],
);



