import { validateAuditRequest } from "../../billing/audit-gate.server.js";
import { runComplianceAudit } from "./audit-runner.server.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Vérifie si un audit planifié est dû pour cette boutique. */
export function isAuditDue(profile) {
  if (!profile?.scheduledAuditEnabled) return false;
  if (!profile.lastAuditAt) return true;

  const intervalDays = profile.auditIntervalDays ?? 7;
  const elapsed = Date.now() - new Date(profile.lastAuditAt).getTime();
  return elapsed >= intervalDays * MS_PER_DAY;
}

export function daysUntilNextAudit(profile) {
  if (!profile?.scheduledAuditEnabled || !profile.lastAuditAt) return 0;
  const intervalDays = profile.auditIntervalDays ?? 7;
  const nextAt =
    new Date(profile.lastAuditAt).getTime() + intervalDays * MS_PER_DAY;
  return Math.max(0, Math.ceil((nextAt - Date.now()) / MS_PER_DAY));
}

/**
 * Lance un audit SCHEDULED si l'intervalle est dépassé.
 * @returns {{ ran: boolean, reason?: string }}
 */
export async function runScheduledAuditIfDue(admin, shop, profile) {
  if (!profile) return { ran: false, reason: "no_profile" };
  if (!isAuditDue(profile)) return { ran: false, reason: "not_due" };

  const check = await validateAuditRequest(profile, "SCHEDULED");
  if (!check.allowed) return { ran: false, reason: "plan_limit" };

  await runComplianceAudit(admin, shop, { trigger: "SCHEDULED" });
  return { ran: true };
}
