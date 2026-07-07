import { getSharedReport } from "../models/compliance.server";

export const loader = async ({ params }) => {
  const html = await getSharedReport(params.token);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
