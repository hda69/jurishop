/** Email de support affiché sur /privacy et dans la doc App Store (SUPPORT_EMAIL). */
export function getSupportEmail() {
  const email = process.env.SUPPORT_EMAIL?.trim();
  return email || null;
}

export function getSupportMailto() {
  const email = getSupportEmail();
  return email ? `mailto:${email}` : null;
}
