// Builds a URL into the BigCommerce control panel itself, a different
// concern from app-url.ts's getAppUrl, which builds URLs into this app.
export function getControlPanelUrl(storeHash: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `https://store-${storeHash}.mybigcommerce.com${normalizedPath}`;
}
