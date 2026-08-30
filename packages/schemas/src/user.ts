import { z } from "zod";
import { userRoleSchema } from "./enums.js";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  team: z.string().optional(), // equipe ou regional, sobretudo para técnicos
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = userSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createUserWithPasswordInputSchema = createUserInputSchema.extend({
  password: z.string().min(8),
});
export type CreateUserWithPasswordInput = z.infer<
  typeof createUserWithPasswordInputSchema
>;

export const updateUserInputSchema = z.object({
  role: userRoleSchema.optional(),
  team: z.string().nullish(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const resetUserPasswordInputSchema = z.object({
  password: z.string().min(8),
});
export type ResetUserPasswordInput = z.infer<
  typeof resetUserPasswordInputSchema
>;
