import type { UserRole } from "@easy-os/schemas";

/**
 * `role`/`team`/`active` são additionalFields do Better Auth (ver apps/api/src/auth.ts)
 * — o client não os infere automaticamente, por isso o cast explícito aqui.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
