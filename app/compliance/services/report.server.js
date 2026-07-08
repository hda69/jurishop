import { DEFAULT_LEGAL_DISCLAIMER } from "../principles.ts";

const STATUS_LABEL = {
  COMPLIANT: "Conforme",
  WARNING: "À améliorer",
  NON_COMPLIANT: "Non conforme",
  UNKNOWN: "Non audité",
};

const RESULT_META = {
  PASS: { label: "Conforme", tone: "success", icon: "✓" },
  FAIL: { label: "Non conforme", tone: "critical", icon: "✕" },
  WARNING: { label: "Attention", tone: "warning", icon: "!" },
  SKIPPED: { label: "Non applicable", tone: "neutral", icon: "–" },
  ERROR: { label: "Erreur", tone: "critical", icon: "✕" },
};

const CATEGORY_LABEL = {
  LEGAL_PAGES: "Pages légales",
  GDPR: "RGPD & données personnelles",
  CONSUMER_RIGHTS: "Droits des consommateurs",
  PRICING: "Prix & promotions",
  TAX: "Fiscalité",
  ACCESSIBILITY: "Accessibilité",
  OTHER: "Autres",
};

const SEVERITY_LABEL = {
  CRITICAL: "Critique",
  WARNING: "Important",
  INFO: "Informatif",
};

/**
 * @param {object} args
 * @param {Map<string, object>} [args.rulesById] définitions enrichies des règles
 */
export function generateAuditReportHtml({
  shop,
  profile,
  audit,
  ruleResults,
  rulesById = new Map(),
}) {
  const date = new Date(audit.completedAt ?? audit.startedAt).toLocaleString(
    "fr-FR",
    { dateStyle: "long", timeStyle: "short" },
  );
  const jurisdictions = JSON.parse(audit.jurisdictions || '["FR"]').join(", ");
  const score = computeScore(audit);

  const categoryCards = [
    { key: "legalPagesStatus", label: "Pages légales" },
    { key: "gdprStatus", label: "RGPD" },
    { key: "consumerRightsStatus", label: "Droits conso." },
    { key: "pricingStatus", label: "Prix & promos" },
  ]
    .map((c) => statusCard(c.label, audit[c.key]))
    .join("");

  const grouped = groupByCategory(ruleResults);
  const sections = Object.entries(grouped)
    .map(([category, results]) =>
      categorySection(category, results, rulesById),
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rapport de conformité JuriShop — ${escapeHtml(profile.shopName ?? shop)}</title>
  <style>
    :root {
      --bg: #f1f2f4;
      --surface: #ffffff;
      --text: #202223;
      --text-subdued: #6d7175;
      --border: #e3e3e3;
      --brand: #008060;
      --brand-dark: #004c3f;
      --success-bg: #e3f1df; --success-fg: #0c5132; --success-br: #a9c9a0;
      --warning-bg: #fff5ea; --warning-fg: #916a00; --warning-br: #ffd79d;
      --critical-bg: #fde9e8; --critical-fg: #8e1f0b; --critical-br: #fda29b;
      --neutral-bg: #f1f2f4; --neutral-fg: #6d7175; --neutral-br: #d2d5d8;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif;
      background: var(--bg); color: var(--text); margin: 0; padding: 32px 16px;
      line-height: 1.5; -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 960px; margin: 0 auto; }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px 24px; margin-bottom: 16px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.04);
    }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo {
      width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--brand), var(--brand-dark));
      color: #fff; font-weight: 700; font-size: 20px;
      display: flex; align-items: center; justify-content: center;
    }
    .brand h1 { font-size: 20px; margin: 0; }
    .brand p { margin: 2px 0 0; color: var(--text-subdued); font-size: 13px; }
    .score-ring {
      display: flex; align-items: center; gap: 14px;
    }
    .score-num {
      font-size: 34px; font-weight: 700; line-height: 1;
      color: var(--brand-dark);
    }
    .score-num span { font-size: 15px; color: var(--text-subdued); font-weight: 500; }
    .meta-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px 24px; margin-top: 4px;
    }
    .meta-item .k { font-size: 12px; color: var(--text-subdued); text-transform: uppercase; letter-spacing: .04em; }
    .meta-item .v { font-size: 15px; font-weight: 600; }
    .cards-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .status-card { border-radius: 10px; padding: 14px 16px; border: 1px solid; }
    .status-card .label { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
      border: 1px solid;
    }
    .badge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .tone-success { background: var(--success-bg); color: var(--success-fg); border-color: var(--success-br); }
    .tone-warning { background: var(--warning-bg); color: var(--warning-fg); border-color: var(--warning-br); }
    .tone-critical { background: var(--critical-bg); color: var(--critical-fg); border-color: var(--critical-br); }
    .tone-neutral { background: var(--neutral-bg); color: var(--neutral-fg); border-color: var(--neutral-br); }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; }
    .stat .n { font-size: 22px; font-weight: 700; }
    .stat .l { font-size: 12.5px; color: var(--text-subdued); }
    h2.section-title { font-size: 15px; margin: 24px 0 10px; display: flex; align-items: center; gap: 8px; }
    h2.section-title .count { color: var(--text-subdued); font-weight: 500; font-size: 13px; }
    .rule {
      border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px;
      overflow: hidden; background: var(--surface);
    }
    .rule > summary {
      list-style: none; cursor: pointer; padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      transition: background .15s;
    }
    .rule > summary::-webkit-details-marker { display: none; }
    .rule > summary:hover { background: #fafbfb; }
    .rule .chevron { margin-left: auto; color: var(--text-subdued); transition: transform .2s; flex-shrink: 0; }
    .rule[open] .chevron { transform: rotate(90deg); }
    .rule .r-main { flex: 1; min-width: 0; }
    .rule .r-title { font-weight: 600; font-size: 14.5px; }
    .rule .r-msg { color: var(--text-subdued); font-size: 13px; margin-top: 2px; }
    .rule .r-body {
      padding: 0 16px 16px 16px; border-top: 1px solid var(--border);
      margin-top: 0; padding-top: 14px; background: #fafbfb;
    }
    .r-body .block { margin-bottom: 14px; }
    .r-body .block:last-child { margin-bottom: 0; }
    .r-body .block-title {
      font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
      color: var(--text-subdued); font-weight: 700; margin-bottom: 6px;
    }
    .r-body p { margin: 0 0 6px; font-size: 13.5px; }
    .r-body ol, .r-body ul { margin: 0; padding-left: 20px; font-size: 13.5px; }
    .r-body li { margin-bottom: 4px; }
    .legal-ref {
      display: inline-block; background: #f0f4ff; color: #2a4b8d;
      border: 1px solid #c9d6f5; border-radius: 6px; padding: 2px 8px;
      font-size: 12.5px; font-weight: 600;
    }
    .disclaimer {
      background: var(--warning-bg); border: 1px solid var(--warning-br);
      color: #6b5115; border-radius: 10px; padding: 14px 18px; font-size: 12.5px;
    }
    footer { text-align: center; color: var(--text-subdued); font-size: 12px; margin-top: 8px; }
    footer a { color: var(--brand); text-decoration: none; }
    @media print {
      body { background: #fff; padding: 0; }
      .card, .rule { box-shadow: none; break-inside: avoid; }
      .rule { border-color: #ccc; }
      .rule .r-body { display: block !important; }
      .rule .chevron { display: none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="brand-logo">J</div>
          <div>
            <h1>Rapport de conformité</h1>
            <p>JuriShop — Audit &amp; Advisor (lecture seule)</p>
          </div>
        </div>
        <div class="score-ring">
          ${scoreBadge(audit.overallStatus)}
          <div class="score-num">${score}<span>/100</span></div>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0" />
      <div class="meta-grid">
        <div class="meta-item"><div class="k">Boutique</div><div class="v">${escapeHtml(profile.shopName ?? shop)}</div></div>
        <div class="meta-item"><div class="k">Date de l'audit</div><div class="v">${date}</div></div>
        <div class="meta-item"><div class="k">Juridictions</div><div class="v">${escapeHtml(jurisdictions)}</div></div>
        <div class="meta-item"><div class="k">Statut global</div><div class="v">${STATUS_LABEL[audit.overallStatus] ?? audit.overallStatus}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="cards-row">${categoryCards}</div>
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0" />
      <div class="stats">
        <div class="stat"><span class="n" style="color:var(--success-fg)">${audit.rulesPassed}</span><span class="l">Conformes</span></div>
        <div class="stat"><span class="n" style="color:var(--critical-fg)">${audit.rulesFailed}</span><span class="l">Non conformes</span></div>
        <div class="stat"><span class="n" style="color:var(--warning-fg)">${audit.rulesWarning}</span><span class="l">À surveiller</span></div>
        <div class="stat"><span class="n">${audit.rulesTotal}</span><span class="l">Points vérifiés</span></div>
      </div>
    </div>

    <div class="card">
      <h2 style="font-size:16px;margin:0 0 4px">Détail des vérifications</h2>
      <p style="color:var(--text-subdued);font-size:13px;margin:0 0 8px">
        Cliquez sur une ligne pour afficher l'explication juridique et les étapes de correction.
      </p>
      ${sections}
    </div>

    <div class="card disclaimer">${escapeHtml(DEFAULT_LEGAL_DISCLAIMER)}</div>
    <footer>Généré par <a href="https://jurishop.app">JuriShop</a> — les données de votre boutique ne sont jamais modifiées.</footer>
  </div>
</body>
</html>`;
}

function computeScore(audit) {
  const weights = { COMPLIANT: 100, WARNING: 60, NON_COMPLIANT: 20, UNKNOWN: 0 };
  const fields = [
    audit.legalPagesStatus,
    audit.gdprStatus,
    audit.consumerRightsStatus,
    audit.pricingStatus,
  ];
  const scores = fields.map((s) => weights[s] ?? 0);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function toneFor(status) {
  if (status === "COMPLIANT") return "success";
  if (status === "WARNING") return "warning";
  if (status === "NON_COMPLIANT") return "critical";
  return "neutral";
}

function scoreBadge(status) {
  const tone = toneFor(status);
  return `<span class="badge tone-${tone}"><span class="dot"></span>${STATUS_LABEL[status] ?? status}</span>`;
}

function statusCard(label, status) {
  const tone = toneFor(status);
  return `<div class="status-card tone-${tone}">
    <div class="label">${escapeHtml(label)}</div>
    <span class="badge tone-${tone}"><span class="dot"></span>${STATUS_LABEL[status] ?? "—"}</span>
  </div>`;
}

function groupByCategory(ruleResults) {
  const order = [
    "LEGAL_PAGES",
    "GDPR",
    "CONSUMER_RIGHTS",
    "PRICING",
    "TAX",
    "ACCESSIBILITY",
    "OTHER",
  ];
  const groups = {};
  for (const r of ruleResults) {
    const cat = r.category ?? "OTHER";
    (groups[cat] ??= []).push(r);
  }
  const sorted = {};
  for (const cat of order) {
    if (groups[cat]) sorted[cat] = groups[cat];
  }
  for (const cat of Object.keys(groups)) {
    if (!sorted[cat]) sorted[cat] = groups[cat];
  }
  return sorted;
}

function categorySection(category, results, rulesById) {
  const label = CATEGORY_LABEL[category] ?? category;
  const rows = results.map((r) => ruleRow(r, rulesById)).join("");
  return `<h2 class="section-title">${escapeHtml(label)}
    <span class="count">${results.length} point${results.length > 1 ? "s" : ""}</span>
  </h2>${rows}`;
}

function ruleRow(result, rulesById) {
  const meta = RESULT_META[result.status] ?? {
    label: result.status,
    tone: "neutral",
    icon: "•",
  };
  const rule = rulesById.get(result.ruleId);
  const title = rule?.title ?? prettifyRuleId(result.ruleId);
  const message = result.message ?? "";

  const explanationBlocks = [];

  if (rule?.description) {
    explanationBlocks.push(`<div class="block">
      <div class="block-title">Ce que cela signifie</div>
      <p>${escapeHtml(rule.description)}</p>
    </div>`);
  }

  if (rule?.legalReference) {
    explanationBlocks.push(`<div class="block">
      <div class="block-title">Référence légale</div>
      <span class="legal-ref">${escapeHtml(rule.legalReference)}</span>
    </div>`);
  }

  const steps = rule?.advisory?.remediationSteps ?? (rule?.remediation ? [rule.remediation] : []);
  if (result.status !== "PASS" && steps.length > 0) {
    explanationBlocks.push(`<div class="block">
      <div class="block-title">Comment corriger</div>
      <ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    </div>`);
  }

  const evidence = renderEvidence(result.details);
  if (evidence) {
    explanationBlocks.push(`<div class="block">
      <div class="block-title">Éléments détectés</div>
      ${evidence}
    </div>`);
  }

  const severityBadge = rule?.severity
    ? `<span class="badge tone-${rule.severity === "critical" ? "critical" : rule.severity === "warning" ? "warning" : "neutral"}" style="font-size:11.5px">${SEVERITY_LABEL[rule.severity.toUpperCase()] ?? rule.severity}</span>`
    : "";

  const body = explanationBlocks.length
    ? explanationBlocks.join("")
    : `<p style="color:var(--text-subdued)">Aucune information complémentaire pour ce point.</p>`;

  return `<details class="rule">
    <summary>
      <span class="badge tone-${meta.tone}"><span class="dot"></span>${meta.label}</span>
      <span class="r-main">
        <span class="r-title">${escapeHtml(title)}</span>
        ${message ? `<span class="r-msg">${escapeHtml(message)}</span>` : ""}
      </span>
      ${severityBadge}
      <svg class="chevron" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </summary>
    <div class="r-body">${body}</div>
  </details>`;
}

function renderEvidence(details) {
  if (!details) return "";
  let parsed;
  try {
    parsed = typeof details === "string" ? JSON.parse(details) : details;
  } catch {
    return "";
  }
  if (!parsed || typeof parsed !== "object") return "";

  const items = [];
  if (Array.isArray(parsed.invalidProducts) && parsed.invalidProducts.length) {
    const list = parsed.invalidProducts
      .slice(0, 10)
      .map(
        (p) =>
          `<li>${escapeHtml(p.title ?? p.handle ?? p.id)} — prix ${escapeHtml(String(p.price))} / barré ${escapeHtml(String(p.compareAtPrice))}</li>`,
      )
      .join("");
    items.push(`<ul>${list}</ul>`);
    if (parsed.totalInvalid > 10) {
      items.push(`<p style="color:var(--text-subdued)">…et ${parsed.totalInvalid - 10} autre(s).</p>`);
    }
  }
  if (Array.isArray(parsed.missingFields) && parsed.missingFields.length) {
    items.push(
      `<ul>${parsed.missingFields.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`,
    );
  }
  if (typeof parsed.checkedCount === "number" && items.length === 0) {
    items.push(`<p style="color:var(--text-subdued)">${parsed.checkedCount} élément(s) vérifié(s).</p>`);
  }
  return items.join("");
}

function prettifyRuleId(ruleId) {
  const parts = String(ruleId).split(".");
  const last = parts[parts.length - 1] ?? ruleId;
  return last.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
