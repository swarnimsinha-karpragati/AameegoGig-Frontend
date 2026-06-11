/**
 * API base URL — change in any ONE of these ways (first match wins):
 *
 * 1. .env / .env.local — full URL:
 *    REACT_APP_API_BASE_URL=http://localhost:5001/api
 *
 * 2. .env / .env.local — named preset:
 *    REACT_APP_API_ENV=local        (or: production)
 *
 * 3. Edit API_ENVIRONMENTS or DEFAULT_API_ENV below (fallback when env is unset)
 */

export const API_ENVIRONMENTS = {
  production: "https://backend-gig.aameego.com/api",
  local: "http://localhost:5001/api",
};

/** Fallback preset when no env variable is set */
export const DEFAULT_API_ENV = "production";

const trimTrailingSlash = (url) => url.replace(/\/$/, "");

const resolveApiBaseUrl = () => {
  const fromUrl = process.env.REACT_APP_API_BASE_URL?.trim();
  if (fromUrl) {
    return { url: trimTrailingSlash(fromUrl), source: "env-url" };
  }

  const envName =
    process.env.REACT_APP_API_ENV?.trim() || DEFAULT_API_ENV;
  const presetUrl = API_ENVIRONMENTS[envName];

  if (presetUrl) {
    return { url: trimTrailingSlash(presetUrl), source: "env-preset", envName };
  }

  const fallback =
    API_ENVIRONMENTS[DEFAULT_API_ENV] || API_ENVIRONMENTS.production;

  return {
    url: trimTrailingSlash(fallback),
    source: "default",
    envName: DEFAULT_API_ENV,
  };
};

const resolved = resolveApiBaseUrl();

/** Used by axios and all API services */
export const API_BASE_URL = resolved.url;

/** Import anywhere you need the active API settings */
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  environments: API_ENVIRONMENTS,
  defaultEnv: DEFAULT_API_ENV,
  activeEnv: resolved.envName || null,
  source: resolved.source,
};

/** Build a full API URL for paths, query strings, or window.open links */
export const getApiUrl = (path = "") => {
  if (!path) return API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

if (process.env.NODE_ENV === "development") {
  console.info(`[API] ${API_BASE_URL} (${resolved.source})`);
}
