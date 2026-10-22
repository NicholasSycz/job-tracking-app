// Falls back to the local API server; set VITE_API_BASE_URL when the backend
// is hosted elsewhere. Empty or whitespace-only values count as unset.
const configured = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (configured || "http://localhost:4000").replace(/\/+$/, "");

export const API_URL = `${API_BASE_URL}/api`;
