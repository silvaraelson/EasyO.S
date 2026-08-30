import { Model } from "@nozbe/watermelondb";
import { date, field, json, readonly, text } from "@nozbe/watermelondb/decorators";

const sanitizeChecklist = (raw: unknown): Record<string, boolean> =>
  raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};

export class ServiceOrder extends Model {
  static table = "service_orders";

  @field("number") number: number;
  @field("service_type_id") serviceTypeId: string;
  @field("customer_id") customerId: string;
  @field("address_id") addressId: string;
  @field("priority") priority: string;
  @field("status") status: string;

  @date("scheduled_at") scheduledAt: Date | undefined;
  @date("check_in_at") checkInAt: Date | undefined;
  @field("check_in_latitude") checkInLatitude: number | undefined;
  @field("check_in_longitude") checkInLongitude: number | undefined;
  @date("check_out_at") checkOutAt: Date | undefined;
  @field("check_out_latitude") checkOutLatitude: number | undefined;
  @field("check_out_longitude") checkOutLongitude: number | undefined;

  @json("checklist_results", sanitizeChecklist) checklistResults: Record<string, boolean>;
  @text("description") description: string | undefined;

  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;
}
