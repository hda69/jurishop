/**
 * Envoi d'alertes email optionnel (Resend API).
 * Configurez RESEND_API_KEY et ALERT_EMAIL_FROM dans Railway.
 */
export async function sendRegressionEmailAlerts(shop, profile, alerts) {
  if (!profile?.alertsEnabled || !profile?.alertEmail || alerts.length === 0) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY; // eslint-disable-line no-undef
  const from =
    process.env.ALERT_EMAIL_FROM || "JuriShop <alerts@jurishop.app>"; // eslint-disable-line no-undef

  if (!apiKey) {
    console.log(
      `[JuriShop] ${alerts.length} alerte(s) pour ${shop} — RESEND_API_KEY non configurée`,
    );
    return;
  }

  const subject = `JuriShop — ${alerts.length} alerte(s) de conformité`;
  const lines = alerts
    .slice(0, 5)
    .map((a) => `• ${a.title}: ${a.message}`)
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [profile.alertEmail],
      subject,
      text: `Bonjour,\n\nJuriShop a détecté des changements sur votre boutique ${shop} :\n\n${lines}\n\nConsultez votre tableau de bord JuriShop pour les détails.\n\n— JuriShop`,
    }),
  });

  if (!response.ok) {
    console.warn(
      `[JuriShop] Échec envoi email pour ${shop}:`,
      await response.text(),
    );
  }
}
