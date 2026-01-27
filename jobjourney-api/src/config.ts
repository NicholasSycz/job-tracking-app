/**
 * Application configuration
 * Validates and exports environment variables
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function optionalEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${name}: ${value}`);
  }
  return parsed;
}

// Environment
export const NODE_ENV = optionalEnv("NODE_ENV", "development");
export const isDevelopment = NODE_ENV === "development";
export const isProduction = NODE_ENV === "production";

// Server
export const PORT = optionalEnvNumber("PORT", 4000);

// Database
export const DATABASE_URL = requireEnv("DATABASE_URL");

// JWT
export const JWT_SECRET = isProduction
  ? requireEnv("JWT_SECRET")
  : optionalEnv("JWT_SECRET", "dev-secret-change-me");

// CORS
// Note: Chrome extensions use "chrome-extension://EXTENSION_ID" as origin
// Add your extension ID to CORS_ORIGINS in production
export const CORS_ORIGINS = optionalEnv("CORS_ORIGINS", "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

// Helper to check if origin should be allowed (supports chrome-extension:// pattern)
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // Allow configured origins
  if (CORS_ORIGINS.includes(origin)) return true;

  // In development, allow all chrome-extension:// origins
  if (isDevelopment && origin.startsWith("chrome-extension://")) {
    return true;
  }

  return false;
}

// Frontend URL (for OAuth redirects, etc.)
export const FRONTEND_URL = optionalEnv("FRONTEND_URL", "http://localhost:3000");

// Google OAuth (optional)
export const GOOGLE_CLIENT_ID = optionalEnv("GOOGLE_CLIENT_ID", "");
export const GOOGLE_CLIENT_SECRET = optionalEnv("GOOGLE_CLIENT_SECRET", "");
export const GOOGLE_CALLBACK_URL = optionalEnv(
  "GOOGLE_CALLBACK_URL",
  `http://localhost:${PORT}/auth/google/callback`
);

// Validate configuration on startup
export function validateConfig(): void {
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`CORS Origins: ${CORS_ORIGINS.join(", ")}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Google OAuth: ${GOOGLE_CLIENT_ID ? "Configured" : "Not configured"}`);

  if (isProduction) {
    // Additional production checks
    if (JWT_SECRET === "dev-secret-change-me") {
      throw new Error("JWT_SECRET must be set in production");
    }
    if (CORS_ORIGINS.includes("http://localhost:3000")) {
      console.warn("Warning: localhost origin allowed in production CORS");
    }
  }
}
