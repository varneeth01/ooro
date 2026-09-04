const primarySiteUrl = "https://theooro.com";
const supportedSiteHosts = new Set([
  "theooro.com",
  "www.theooro.com",
  "ooro.media",
  "www.ooro.media",
  "ooro.network",
  "www.ooro.network",
  "ooro.digital",
  "www.ooro.digital",
  "oroo.tech",
  "www.oroo.tech",
]);

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const configuredHost = (() => {
  if (!configuredSiteUrl) return "";
  try {
    return new URL(configuredSiteUrl).host;
  } catch {
    return "";
  }
})();

// Only the canonical domain is emitted in SEO URLs. A stale or unknown env
// value must not make search engines index an unintended domain.
export const siteUrl = configuredSiteUrl && supportedSiteHosts.has(configuredHost) && configuredHost === "theooro.com"
  ? configuredSiteUrl
  : primarySiteUrl;
