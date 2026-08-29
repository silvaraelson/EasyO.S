import { eq } from "drizzle-orm";
import { userRoleSchema } from "@easy-os/schemas";
import { auth } from "../auth.js";
import { db } from "./client.js";
import { user } from "./schema.js";

const [, , email, name, password, roleArg] = process.argv;

if (!email || !name || !password) {
  console.error("Uso: pnpm db:seed <email> <nome> <senha> [papel=attendant]");
  process.exit(1);
}

const role = userRoleSchema.parse(roleArg ?? "attendant");

await auth.api.signUpEmail({ body: { email, name, password } });

const [createdUser] = await db.select().from(user).where(eq(user.email, email));
if (!createdUser) {
  throw new Error("Usuário não foi criado — verifique os logs do Better Auth acima.");
}

await db.update(user).set({ role }).where(eq(user.id, createdUser.id));

console.log(`Usuário criado: ${email} (papel: ${role})`);
process.exit(0);
