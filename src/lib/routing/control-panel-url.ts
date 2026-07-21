// Builds a URL into the BigCommerce control panel itself — a different
// concern from app-url.ts's getAppUrl/getAbsoluteAppUrl, which build URLs
// into this app. Always absolute and always targets
// store-<hash>.mybigcommerce.com, regardless of DataMode, since there's no
// "relative" control-panel path from inside this app's iframe.
export function getControlPanelUrl(storeHash: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `https://store-${storeHash}.mybigcommerce.com${normalizedPath}`;
}
