CREATE TYPE "public"."alert_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" varchar(60) NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"description" varchar(500),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"location_accuracy" numeric(10, 2),
	"status" "alert_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity" varchar(80),
	"entity_id" varchar(80),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"relationship" varchar(60),
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"contact_id" uuid,
	"destination" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"provider_sid" varchar(80),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"registration_number" varchar(20) NOT NULL,
	"make" varchar(80) NOT NULL,
	"model" varchar(80) NOT NULL,
	"color" varchar(40) NOT NULL,
	"description" text,
	"status" "vehicle_status" DEFAULT 'ACTIVE' NOT NULL,
	"qr_token" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_contact_id_emergency_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."emergency_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_alert_idx" ON "alert_events" USING btree ("alert_id","created_at");--> statement-breakpoint
CREATE INDEX "alerts_vehicle_idx" ON "alerts" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_vehicle_idx" ON "emergency_contacts" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicles_owner_idx" ON "vehicles" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_registration_owner_unique" ON "vehicles" USING btree ("owner_id","registration_number");