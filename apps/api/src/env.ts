import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3333),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  // Lista separada por vírgula — dev local + web publicado convivem (ex.:
  // "http://localhost:5173,https://easy-os-web.onrender.com").
  WEB_ORIGIN: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()).min(1)),
});

export const env = envSchema.parse(process.env);
