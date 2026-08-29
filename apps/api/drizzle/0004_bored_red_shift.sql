ALTER TABLE "service_orders" ADD COLUMN "check_in_latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "check_in_longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "check_out_latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "check_out_longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "checklist_results" jsonb DEFAULT '{}'::jsonb NOT NULL;