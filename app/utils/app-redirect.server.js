import { redirect } from "react-router";

/**
 * Redirection interne en conservant les paramètres embarqués Shopify
 * (shop, host, etc.). Sans eux, l'iframe affiche souvent une page vide « 200 ».
 */
export function appRedirect(request, pathname) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return redirect(`${path}${qs ? `?${qs}` : ""}`);
}
