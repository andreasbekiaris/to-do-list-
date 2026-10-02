import "server-only";

import { z } from "zod";

const authEnvironment = z.object({
  AUTH_SECRET: z.string().min(32),
  AUTH_GITHUB_ID: z.string().trim().min(1),
  AUTH_GITHUB_SECRET: z.string().trim().min(1),
  ALLOWED_GITHUB_ID: z.string().regex(/^[1-9]\d*$/),
});

export function isAuthConfigured() {
  return authEnvironment.safeParse(process.env).success;
}
