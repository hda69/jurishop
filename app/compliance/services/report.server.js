import { DEFAULT_LEGAL_DISCLAIMER } from "../principles.ts";

const STATUS_LABEL = {
  COMPLIANT: "Conforme",
  WARNING: "À améliorer",
  NON_COMPLIANT: "Non conforme",
  UNKNOWN: "Non audité",
};

const RESULT_LABEL = {
  PASS: "✓ Conforme",
  FAIL: "✗ Non conforme",
  WARNING: "⚠ Attention",
  SKIPPED: "— Ignoré",
  ERROR: "Erreur",
};

export function generateAuditReportHtml({ shop, profile, audit, ruleResults }) {
  const date = new Date(audit.completedAt ?? audit.startedAt).toLocaleString(
    "fr-FR",
  );

  const rows = ruleResults
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.ruleId)}</td>
      <td>${RESULT_LABEL[r.status] ?? r.status}</td>
      <td>${escapeHtml(r.message ?? "")}</td>
      <td>${r.jurisdiction}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport JuriShop — ${escapeHtml(shop)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 24px; }
    .meta { color: #666; margin-bottom: 24px; }
    .score { display: flex; gap: 16px; margin: 24px 0; }
    .score div { padding: 12px 20px; border-radius: 8px; background: #f6f6f7; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #e1e1e1; padding: 8px 12px; text-align: left; font-size: 14px; }
    th { background: #f6f6f7; }
    .disclaimer { margin-top: 40px; padding: 16px; background: #fff8e6; border-radius: 8px; font-size: 13px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Rapport d'audit JuriShop</h1>
  <p class="meta">
    <strong>Boutique :</strong> ${escapeHtml(profile.shopName ?? shop)}<br />
    <strong>Date :</strong> ${date}<br />
    <strong>Juridictions :</strong> ${escapeHtml(JSON.parse(audit.jurisdictions || '["FR"]').join(", "))}
  </p>

  <div class="score">
    <div><strong>Global</strong><br />${STATUS_LABEL[audit.overallStatus] ?? audit.overallStatus}</div>
    <div><strong>Pages légales</strong><br />${STATUS_LABEL[audit.legalPagesStatus] ?? "-"}</div>
    <div><strong>RGPD</strong><br />${STATUS_LABEL[audit.gdprStatus] ?? "-"}</div>
    <div><strong>Consommateurs</strong><br />${STATUS_LABEL[audit.consumerRightsStatus] ?? "-"}</div>
    <div><strong>Prix</strong><br />${STATUS_LABEL[audit.pricingStatus] ?? "-"}</div>
  </div>

  <p>
    <strong>Règles :</strong> ${audit.rulesPassed} conformes,
    ${audit.rulesFailed} échecs,
    ${audit.rulesWarning} avertissements
    (${audit.rulesTotal} au total)
  </p>

  <table>
    <thead>
      <tr><th>Règle</th><th>Statut</th><th>Détail</th><th>Juridiction</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <p class="disclaimer">${escapeHtml(DEFAULT_LEGAL_DISCLAIMER)}</p>
  <p class="meta">Généré par JuriShop — mode Audit &amp; Advisor (lecture seule)</p>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
