import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TEMPLATES_DIR = join(process.cwd(), "app/compliance/templates");

const TEMPLATE_FILES = {
  "mentions-legales-fr": "fr/mentions-legales.html",
  "cgv-fr": "fr/cgv.html",
  "politique-confidentialite-fr": "fr/politique-confidentialite.html",
};

/** Charge un modèle de texte par identifiant (lecture fichier uniquement). */
export async function loadTextTemplate(templateId) {
  const relativePath = TEMPLATE_FILES[templateId];
  if (!relativePath) return null;

  try {
    const body = await readFile(join(TEMPLATES_DIR, relativePath), "utf-8");
    return { id: templateId, body };
  } catch {
    return null;
  }
}
