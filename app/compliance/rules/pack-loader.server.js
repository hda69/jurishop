import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PACKS_DIR = join(process.cwd(), "app/compliance/rules/packs");

export async function loadRulePacks(jurisdictions) {
  const packs = [];
  for (const jurisdiction of jurisdictions) {
    const packPath = join(PACKS_DIR, jurisdiction.toLowerCase(), "index.json");
    try {
      const raw = await readFile(packPath, "utf-8");
      packs.push(JSON.parse(raw));
    } catch {
      // Pack non disponible
    }
  }
  return packs;
}

export function flattenRules(packs) {
  const byId = new Map();
  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (rule.enabled !== false) byId.set(rule.id, rule);
    }
  }
  return [...byId.values()];
}

/** Retourne une Map ruleId -> définition enrichie pour les juridictions données. */
export async function loadRulesById(jurisdictions) {
  const packs = await loadRulePacks(jurisdictions);
  const rules = flattenRules(packs);
  return new Map(rules.map((r) => [r.id, r]));
}
