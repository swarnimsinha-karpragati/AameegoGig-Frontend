const DEFAULT_API_BASE_URL = 'https://backend-gig.aameego.com/api';

export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, '');

/** Build a full API URL for paths, query strings, or window.open links */
export const getApiUrl = (path = '') => {
  if (!path) return API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
