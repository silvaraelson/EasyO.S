CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Easy OS' NOT NULL,
	"document" text,
	"phone" text,
	"email" text,
	"logo_data_url" text,
	"signature_data_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "low_stock_threshold" integer;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "technical_report" text;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "reminder_sent_at" timestamp;