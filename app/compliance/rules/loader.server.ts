import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ComplianceRule, RulePack } from "./schema";

const PACKS_DIR = join(process.cwd(), "app/compliance/rules/packs");

/** Charge les packs JSON embarqués par juridiction (FR, EU, BE, CH, LU). */
export async function loadRulePacks(
  jurisdictions: string[],
): Promise<RulePack[]> {
  const packs: RulePack[] = [];

  for (const jurisdiction of jurisdictions) {
    const packPath = join(PACKS_DIR, jurisdiction.toLowerCase(), "index.json");
    try {
      const raw = await readFile(packPath, "utf-8");
      packs.push(JSON.parse(raw) as RulePack);
    } catch {
      // Pack non disponible pour cette juridiction — ignoré silencieusement
    }
  }

  return packs;
}

export function flattenRules(packs: RulePack[]): ComplianceRule[] {
  const byId = new Map<string, ComplianceRule>();

  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (rule.enabled !== false) {
        byId.set(rule.id, rule);
      }
    }
  }

  return [...byId.values()];
}

export function getPackVersions(packs: RulePack[]): Record<string, string> {
  return Object.fromEntries(packs.map((p) => [p.jurisdiction, p.version]));
}
