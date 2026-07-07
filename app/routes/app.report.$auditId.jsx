import { authenticate } from "../shopify.server";
import { exportAuditReport } from "../models/compliance.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const html = await exportAuditReport(session.shop, params.auditId);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="jurishop-audit-${params.auditId}.html"`,
    },
  });
};
