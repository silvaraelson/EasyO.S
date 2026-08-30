import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { updateCompanySettingsInputSchema } from "@easy-os/schemas";
import { db } from "../db/client.js";
import { companySettings } from "../db/schema.js";
import { getOrCreateCompanySettings } from "../lib/company-settings.js";
import { requireAuth, requireRole } from "../lib/guards.js";

export const companySettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/company-settings", { preHandler: requireAuth }, async () => {
    return getOrCreateCompanySettings();
  });

  app.put(
    "/company-settings",
    { preHandler: requireRole("admin") },
    async (request) => {
      const input = updateCompanySettingsInputSchema.parse(request.body);
      const current = await getOrCreateCompanySettings();

      const [updated] = await db
        .update(companySettings)
        .set(input)
        .where(eq(companySettings.id, current.id))
        .returning();

      return updated;
    },
  );
};
