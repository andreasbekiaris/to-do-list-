import { z } from "zod";

const username = z.string().trim().toLowerCase().min(3, "Use at least 3 characters for your username.")
  .max(32, "Keep your username under 33 characters.")
  .regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dots, underscores, or hyphens in your username.");

export const loginSchema = z.object({
  username,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
});

export const registrationSchema = loginSchema.extend({
  password: z.string().min(12, "Use at least 12 characters for your password.").max(128, "Keep your password under 129 characters."),
  confirmPassword: z.string().max(128),
  setupKey: z.string().min(1, "Enter your setup code.").max(256),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Your passwords don’t match.", path: ["confirmPassword"],
});

export type AuthFormState = { error?: string };
