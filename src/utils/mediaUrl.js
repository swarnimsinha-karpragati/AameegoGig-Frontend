import { API_BASE_URL } from "../config/api";

/** Backend origin without /api — used for legacy /uploads paths */
export const getBackendOrigin = () =>
  API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * Prefer a signed/display URL from the API.
 * Never return raw s3:// URIs — browsers cannot load them.
 */
export const resolveMediaUrl = (displayUrl, storedPath) => {
  const display = typeof displayUrl === "string" ? displayUrl.trim() : "";
  if (
    display &&
    (display.startsWith("http://") ||
      display.startsWith("https://") ||
      display.startsWith("data:") ||
      display.startsWith("blob:"))
  ) {
    return display;
  }

  if (!storedPath || typeof storedPath !== "string") return "";

  const path = storedPath.trim();
  if (!path || path.startsWith("s3://")) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  if (path.startsWith("/uploads/") || path.startsWith("/public/")) {
    return `${getBackendOrigin()}${path}`;
  }

  return "";
};
