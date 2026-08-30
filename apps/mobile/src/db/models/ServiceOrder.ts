import { Model } from "@nozbe/watermelondb";
import { date, field, json, readonly, text } from "@nozbe/watermelondb/decorators";

const sanitizeChecklist = (raw: unknown): Record<string, boolean> =>
  raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};

export class ServiceOrder extends Model {
  static table = "service_orders";

  @field("number") declare number: number;
  @field("service_type_id") declare serviceTypeId: string;
  @field("customer_id") declare customerId: string;
  @field("address_id") declare addressId: string;
  @field("priority") declare priority: string;
  @field("status") declare status: string;

  @date("scheduled_at") declare scheduledAt?: Date;
  @date("check_in_at") declare checkInAt?: Date;
  @field("check_in_latitude") declare checkInLatitude?: number;
  @field("check_in_longitude") declare checkInLongitude?: number;
  @date("check_out_at") declare checkOutAt?: Date;
  @field("check_out_latitude") declare checkOutLatitude?: number;
  @field("check_out_longitude") declare checkOutLongitude?: number;

  @json("checklist_results", sanitizeChecklist) declare checklistResults: Record<string, boolean>;
  @text("description") declare description?: string;

  @readonly @date("created_at") declare createdAt: Date;
  @readonly @date("updated_at") declare updatedAt: Date;
}
