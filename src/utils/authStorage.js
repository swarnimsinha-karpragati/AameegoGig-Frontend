const TOKEN_KEY = "token";
const USER_KEY = "user";

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

export const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
    return !!getToken() && !!getStoredUser();
};