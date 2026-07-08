import { detectCookieSignals } from "../constants/scan-signals.js";

export async function checkInstalledAppsAudit(params, context) {
  const apps = context.installedApps ?? [];
  const threshold = params.warnAboveCount ?? 8;
  const cookieSignals = detectCookieSignals(context);

  if (apps.length === 0) {
    return {
      status: "WARNING",
      message:
        "Impossible de lister les apps installées (permissions limitées). Vérifiez manuellement vos apps tierces.",
      details: { note: "Auditez chaque app : politique de confidentialité et DPA." },
    };
  }

  const trackingApps = apps.filter((app) =>
    /analytics|pixel|track|ads|marketing|chat|popup/i.test(
      `${app.title} ${app.handle ?? ""}`,
    ),
  );

  const issues = [];
  if (apps.length > threshold) {
    issues.push(`${apps.length} apps installées (seuil : ${threshold})`);
  }
  if (trackingApps.length > 0 && !cookieSignals.hasSignal) {
    issues.push(
      `${trackingApps.length} app(s) potentiellement traceuse(s) sans CMP détectée`,
    );
  }

  if (issues.length === 0) {
    return {
      status: "PASS",
      message: `${apps.length} app(s) installée(s) — aucun signal d'alerte majeur.`,
      details: { appCount: apps.length, apps: apps.map((a) => a.title) },
    };
  }

  return {
    status: apps.length > threshold + 5 ? "FAIL" : "WARNING",
    message: issues.join(". ") + ".",
    details: {
      appCount: apps.length,
      trackingApps: trackingApps.map((a) => a.title),
      cookieApps: cookieSignals.cookieApps,
      apps: apps.map((a) => ({ title: a.title, handle: a.handle })),
      scanMethod: "installed_apps_heuristic",
      remediation:
        "Pour chaque app : vérifiez sa politique de confidentialité, le DPA, et supprimez les apps inutilisées.",
    },
  };
}
