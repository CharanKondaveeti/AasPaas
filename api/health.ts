import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify({
    ok: true,
    runtime: "vercel-node",
    supabaseConfigured: Boolean(
      process.env.VITE_SUPABASE_URL &&
      (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY) &&
      process.env.SUPABASE_SECRET_KEY
    ),
    rateLimitConfigured: Boolean(process.env.RATE_LIMIT_SECRET && process.env.RATE_LIMIT_SECRET.length >= 32),
  }));
}
