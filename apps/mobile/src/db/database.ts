import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { schema } from "./schema";
import { ServiceOrder } from "./models/ServiceOrder";

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  dbName: "easyos",
  onSetUpError: (error) => {
    console.error("Erro ao abrir o banco local:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ServiceOrder],
});
