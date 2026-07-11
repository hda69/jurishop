import { authenticate } from "../shopify.server";
import { exportAuditReport } from "../models/compliance.server";
import { syncBillingPlanFromShopify } from "../billing/subscription.server.js";

export const loader = async ({ request, params }) => {
  const { session, billing, admin } = await authenticate.admin(request);
  await syncBillingPlanFromShopify(session.shop, billing, { admin });
  const html = await exportAuditReport(session.shop, params.auditId);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="jurishop-audit-${params.auditId}.html"`,
    },
  });
};
