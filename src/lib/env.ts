import "server-only";

import { z } from "zod";

const authEnvironment = z.object({
  AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export function isAuthConfigured() {
  return authEnvironment.safeParse(process.env).success;
}

export function isRegistrationConfigured() {
  const length = process.env.ACCOUNT_SETUP_KEY?.length ?? 0;
  return isAuthConfigured() && length >= 16 && length <= 256;
}
