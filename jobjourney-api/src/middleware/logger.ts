import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { AuthRequest } from "../types/auth";
import { fileLogger } from "../utils/fileLogger";

// Sensitive fields to exclude from logging
const SENSITIVE_FIELDS = ["password", "token", "authorization", "secret", "apikey"];

// Sanitize object by removing sensitive fields
function sanitize(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = randomUUID();

  // Attach request ID to request object for use in error handlers
  req.requestId = requestId;

  // Log request start (at debug level - we only log completion in production)
  const authReq = req as AuthRequest;

  // Capture the original end function
  const originalEnd = res.end;

  // Override end to log when response completes
  res.end = function (chunk?: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
    const duration = Date.now() - startTime;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      userId: authReq.userId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get("user-agent"),
    };

    // Add error message for error responses
    if (res.statusCode >= 400) {
      logEntry.error = res.statusMessage;
    }

    // Log with appropriate level based on status code
    if (res.statusCode >= 500) {
      console.error(formatLog(logEntry));
      fileLogger.error(`${req.method} ${logEntry.path} ${res.statusCode}`, logEntry as unknown as Record<string, unknown>);
    } else if (res.statusCode >= 400) {
      console.warn(formatLog(logEntry));
      fileLogger.warn(`${req.method} ${logEntry.path} ${res.statusCode}`, logEntry as unknown as Record<string, unknown>);
    } else {
      console.log(formatLog(logEntry));
    }

    // Always log request to request log file
    fileLogger.request(`${req.method} ${logEntry.path} ${res.statusCode} ${duration}ms`, logEntry as unknown as Record<string, unknown>);

    // Call original end - use res instead of this to avoid implicit any
    return originalEnd.call(res, chunk, encoding as BufferEncoding, callback as () => void);
  } as typeof res.end;

  next();
}

// Export sanitize for use in error handlers
export { sanitize };
