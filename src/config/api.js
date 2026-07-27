/**
 * Which backend to talk to.
 *
 * NORMAL LEVER — set the environment NAME per deployment:
 *   REACT_APP_API_ENV = local | development | production
 *   (.env.local for your machine; a Vercel env var per scope for the
 *    Production and Preview deployments). It maps to the matching URL below.
 *
 * Resolution order (first match wins):
 *   1. REACT_APP_API_BASE_URL — explicit full URL; overrides everything (escape hatch).
 *   2. REACT_APP_API_ENV      — the environment name above. ← use this.
 *   3. Browser hostname       — fallback if neither var is set on a build.
 *   4. Default                — production.
 */

export const PRODUCTION_API_URL = "https://backend-gig.aameego.com/api";
export const DEVELOPMENT_API_URL = "https://dev-gig.aameego.com/api";
export const LOCAL_API_URL = "http://localhost:5001/api";

export const API_ENVIRONMENTS = {
  production: PRODUCTION_API_URL,
  development: DEVELOPMENT_API_URL,
  local: LOCAL_API_URL,
};

export const DEFAULT_API_ENV = "production";

const trimTrailingSlash = (url) => url.replace(/\/$/, "");

// Every backend route lives under /api, so guarantee the base ends with it —
// tolerates a URL entered without the suffix (e.g. https://dev-gig.aameego.com).
const ensureApiSuffix = (url) => {
  const trimmed = trimTrailingSlash(url);
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

// Map the site's own hostname to a backend environment.
const envFromHostname = (hostname) => {
  if (hostname === "localhost" || hostname === "127.0.0.1") return "local";
  if (hostname.includes("gig-dev")) return "development"; // dev frontend
  return "production";
};

const resolveApiBaseUrl = () => {
  // 1. Explicit full URL — always wins.
  const fromUrl = process.env.REACT_APP_API_BASE_URL?.trim();
  if (fromUrl) {
    return { url: trimTrailingSlash(fromUrl), source: "env-url" };
  }

  // 2. Named preset from env.
  const envName = process.env.REACT_APP_API_ENV?.trim();
  if (envName && API_ENVIRONMENTS[envName]) {
    return {
      url: trimTrailingSlash(API_ENVIRONMENTS[envName]),
      source: "env-preset",
      envName,
    };
  }

  // 3. Infer from the browser hostname (fixes Vercel deploys with no env var).
  if (typeof window !== "undefined" && window.location?.hostname) {
    const inferred = envFromHostname(window.location.hostname);
    return {
      url: trimTrailingSlash(API_ENVIRONMENTS[inferred]),
      source: "hostname",
      envName: inferred,
    };
  }

  // 4. Last resort.
  return {
    url: trimTrailingSlash(PRODUCTION_API_URL),
    source: "default",
    envName: "production",
  };
};

const resolved = resolveApiBaseUrl();

/** Used by axios and all API services */
export const API_BASE_URL = ensureApiSuffix(resolved.url);

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
  console.info(
    `[API] env=${API_CONFIG.activeEnv} → ${API_BASE_URL} (via ${resolved.source})`
  );
}
