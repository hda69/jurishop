import {
  assertManualAuditAllowed,
  assertPlanFeature,
  canRunAuditTrigger,
  recordManualAudit,
} from "./subscription.server.js";
import { getPlanFeatures, PLAN_IDS } from "./plans.server.js";

export async function validateAuditRequest(profile, trigger) {
  const triggerCheck = canRunAuditTrigger(profile, trigger);
  if (!triggerCheck.allowed) return triggerCheck;

  if (trigger === "MANUAL") {
    return assertManualAuditAllowed(profile);
  }

  return { allowed: true };
}

export async function afterAuditRecorded(shop, trigger) {
  if (trigger === "MANUAL") {
    await recordManualAudit(shop);
  }
}

export { assertPlanFeature, getPlanFeatures, PLAN_IDS };
