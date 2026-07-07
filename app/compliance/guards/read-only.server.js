import {
  ALLOWED_SCOPES,
  FORBIDDEN_OPERATION_PREFIXES,
} from "../principles.ts";

export function assertReadOnlyGraphQLOperation(operation) {
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

export function assertAllowedScopes(grantedScopes) {
  const granted = new Set(grantedScopes.split(",").map((s) => s.trim()));
  const forbidden = [...granted].filter(
    (scope) => !ALLOWED_SCOPES.includes(scope),
  );

  if (forbidden.length > 0) {
    throw new ReadOnlyViolationError(
      `Scopes non autorisés détectés : ${forbidden.join(", ")}. ` +
        "JuriShop n'accepte que des scopes en lecture seule.",
    );
  }
}

export class ReadOnlyViolationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReadOnlyViolationError";
  }
}
