import { appSchema, tableSchema } from "@nozbe/watermelondb/Schema";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "service_orders",
      columns: [
        { name: "number", type: "number" },
        { name: "service_type_id", type: "string" },
        { name: "customer_id", type: "string" },
        { name: "address_id", type: "string" },
        { name: "priority", type: "string" },
        { name: "status", type: "string" },
        { name: "scheduled_at", type: "number", isOptional: true },
        { name: "check_in_at", type: "number", isOptional: true },
        { name: "check_in_latitude", type: "number", isOptional: true },
        { name: "check_in_longitude", type: "number", isOptional: true },
        { name: "check_out_at", type: "number", isOptional: true },
        { name: "check_out_latitude", type: "number", isOptional: true },
        { name: "check_out_longitude", type: "number", isOptional: true },
        { name: "checklist_results", type: "string" }, // JSON stringificado
        { name: "description", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
