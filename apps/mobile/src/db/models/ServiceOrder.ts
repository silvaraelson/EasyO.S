import { Model } from "@nozbe/watermelondb";
import { date, field, json, readonly, text } from "@nozbe/watermelondb/decorators";

const sanitizeChecklist = (raw: unknown): Record<string, boolean> =>
  raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};

export class ServiceOrder extends Model {
  static table = "service_orders";

  @field("number") number!: number;
  @field("service_type_id") serviceTypeId!: string;
  @field("customer_id") customerId!: string;
  @field("address_id") addressId!: string;
  @field("priority") priority!: string;
  @field("status") status!: string;

  @date("scheduled_at") scheduledAt?: Date;
  @date("check_in_at") checkInAt?: Date;
  @field("check_in_latitude") checkInLatitude?: number;
  @field("check_in_longitude") checkInLongitude?: number;
  @date("check_out_at") checkOutAt?: Date;
  @field("check_out_latitude") checkOutLatitude?: number;
  @field("check_out_longitude") checkOutLongitude?: number;

  @json("checklist_results", sanitizeChecklist) checklistResults!: Record<string, boolean>;
  @text("description") description?: string;

  @readonly @date("created_at") createdAt!: Date;
  @readonly @date("updated_at") updatedAt!: Date;
}
