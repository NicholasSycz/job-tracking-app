/**
 * Frontend configuration
 * Uses Vite environment variables (import.meta.env.VITE_*)
 */

// API Base URL - defaults to localhost:4000 in development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// Convenience export for API endpoints
export const API_URL = `${API_BASE_URL}/api`;
