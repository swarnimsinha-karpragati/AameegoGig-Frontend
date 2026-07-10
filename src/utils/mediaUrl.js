import { API_BASE_URL } from "../config/api";

/** Backend origin without /api — used for legacy /uploads paths */
export const getBackendOrigin = () =>
  API_BASE_URL.replace(/\/api\/?$/, "");

export const resolveMediaUrl = (displayUrl, storedPath) => {
  if (displayUrl) return displayUrl;
  if (!storedPath) return "";

  if (
    storedPath.startsWith("http://") ||
    storedPath.startsWith("https://") ||
    storedPath.startsWith("data:")
  ) {
    return storedPath;
  }

  if (storedPath.startsWith("/uploads/") || storedPath.startsWith("/public/")) {
    return `${getBackendOrigin()}${storedPath}`;
  }

  return storedPath;
};
