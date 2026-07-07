import { runCronAuditsForAllShops } from "../compliance/engine/cron-audit.server.js";

/**
 * Endpoint cron pour Railway / service externe.
 * GET /api/cron/audit
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export const loader = async ({ request }) => {
  const secret = process.env.CRON_SECRET; // eslint-disable-line no-undef
  const auth = request.headers.get("Authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runCronAuditsForAllShops();

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...result,
  });
};

export const action = loader;
