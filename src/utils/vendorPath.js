export const toVendorSlug = (vendorName) =>
  String(vendorName || "")
    .trim()
    .replace(/\//g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

export const vendorDashboardPath = (user) => {
  const slug = toVendorSlug(user?.vendorName);
  return slug ? `/${slug}/dashboard` : "/dashboard";
};

/** `path` under the vendor segment of `location` (e.g. "/acme/letters" + "/settings" -> "/acme/settings"). */
export const vendorScopedPath = (location, path) => {
  const vendor = String(location?.pathname || "").split("/").filter(Boolean)[0];
  return vendor ? `/${vendor}${path}` : path;
};

export const ORG_PROFILE_SETTINGS_PATH = "/settings?tab=organization";

/**
 * Returns the same location under `vendorCode` (keeping search and hash),
 * or null when the URL already carries that vendor or has no vendor segment.
 */
export const replaceVendorSegment = (location, vendorCode) => {
  if (!vendorCode || !location) return null;
  const segments = String(location.pathname || "").split("/").filter(Boolean);
  const currentVendor = segments[0];
  if (!currentVendor || currentVendor === vendorCode) return null;
  const remainingPath = segments.slice(1).join("/");
  return `/${vendorCode}/${remainingPath}${location.search || ""}${location.hash || ""}`;
};
