import {
  ALLOWED_SCOPES,
  FORBIDDEN_OPERATION_PREFIXES,
} from "../principles";

/**
 * Bloque toute tentative d'appel mutation vers Shopify.
 * À appeler dans le client GraphQL avant chaque requête.
 */
export function assertReadOnlyGraphQLOperation(operation: string): void {
  const normalized = operation.trim().toLowerCase();

  for (const prefix of FORBIDDEN_OPERATION_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      throw new ReadOnlyViolationError(
        `Opération interdite en mode Audit & Advisor : "${operation}". ` +
          "JuriShop ne modifie jamais la boutique du marchand.",
      );
    }
  }
}

export function assertAllowedScopes(grantedScopes: string): void {
  const granted = new Set(grantedScopes.split(",").map((s) => s.trim()));
  const forbidden = [...granted].filter(
    (scope) => !ALLOWED_SCOPES.includes(scope as (typeof ALLOWED_SCOPES)[number]),
  );

  if (forbidden.length > 0) {
    throw new ReadOnlyViolationError(
      `Scopes non autorisés détectés : ${forbidden.join(", ")}. ` +
        "JuriShop n'accepte que des scopes en lecture seule.",
    );
  }
}

export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadOnlyViolationError";
  }
}
