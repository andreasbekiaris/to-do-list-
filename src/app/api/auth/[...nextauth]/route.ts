import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { isAuthConfigured } from "@/lib/env";

export const runtime = "nodejs";

function unavailable() {
  return Response.json(
    { error: "Sign-in is temporarily unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

// OAuth endpoints must be public so a logged-out user can authenticate.
export async function GET(request: NextRequest) {
  return isAuthConfigured() ? handlers.GET(request) : unavailable();
}

export async function POST(request: NextRequest) {
  return isAuthConfigured() ? handlers.POST(request) : unavailable();
}
