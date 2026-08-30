import { db } from "../db/client.js";
import { companySettings } from "../db/schema.js";

/**
 * Configurações da empresa são uma linha única — se ainda não existir, é
 * criada com os valores padrão na primeira leitura/escrita. Usado tanto
 * pela rota de configurações quanto pelos geradores de PDF.
 */
export async function getOrCreateCompanySettings() {
  const [existing] = await db.select().from(companySettings).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(companySettings).values({}).returning();
  return created!;
}
