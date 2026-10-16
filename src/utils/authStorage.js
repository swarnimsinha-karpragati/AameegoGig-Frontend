const TOKEN_KEY = "token";
const USER_KEY = "user";
const ORGS_KEY = "organisations";

const readJson = (raw) => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const storageForSession = () =>
    sessionStorage.getItem(TOKEN_KEY) && !localStorage.getItem(TOKEN_KEY)
        ? sessionStorage
        : localStorage;

export const setAuthData = (token, user, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Clear old auth data from both storages
    clearAuthData();

    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => {
    return (
        localStorage.getItem(TOKEN_KEY) ||
        sessionStorage.getItem(TOKEN_KEY)
    );
};

export const getStoredUser = () => {
    const user =
        localStorage.getItem(USER_KEY) ||
        sessionStorage.getItem(USER_KEY);

    if (!user) return null;

    try {
        return JSON.parse(user);
    } catch {
        return null;
    }
};

// Session-scoped caches (e.g. role access loads) register here so they never outlive
// the user they were loaded for; listeners run on logout, 401, and before every login.
const authClearedListeners = new Set();

export const onAuthCleared = (listener) => {
    authClearedListeners.add(listener);
    return () => authClearedListeners.delete(listener);
};

export const getOrganisations = () => {
    const raw = localStorage.getItem(ORGS_KEY) || sessionStorage.getItem(ORGS_KEY);
    const parsed = raw ? readJson(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
};

export const setOrganisations = (organisations) => {
    storageForSession().setItem(
        ORGS_KEY,
        JSON.stringify(Array.isArray(organisations) ? organisations : [])
    );
};

// Keeps the storage the current session already uses, and clears role caches first.
export const replaceAuthSession = (token, user, organisations) => {
    const storage = storageForSession();
    clearAuthData();
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
    storage.setItem(ORGS_KEY, JSON.stringify(Array.isArray(organisations) ? organisations : []));
    window.dispatchEvent(new Event("user-updated"));
};

/**
 * User record from /auth/me, or null when that response belongs to a token
 * that has since been replaced (organisation switch or a new login).
 */
export const currentUserToStore = (data, tokenAtRequest, tokenNow) => {
    if (!data?.user) return null;
    if (!tokenAtRequest || tokenAtRequest !== tokenNow) return null;
    return data.user;
};

export const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORGS_KEY);

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ORGS_KEY);
    authClearedListeners.forEach((listener) => listener());
};

export const isAuthenticated = () => {
    return !!getToken() && !!getStoredUser();
};