export function getSiteUrl() {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/$/, '');
  }

  const currentOrigin = window.location.origin;
  if (!currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
    return currentOrigin;
  }

  throw new Error('Missing VITE_SITE_URL. Set it to your live Vercel domain to avoid localhost auth redirects.');
}
