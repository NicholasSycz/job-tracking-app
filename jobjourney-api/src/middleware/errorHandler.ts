import { Request, Response, NextFunction } from 'express';
import { AppError, toErrorResponse } from '../utils/errors';
import { fileLogger } from '../utils/fileLogger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  // Log error for debugging
  if (err instanceof AppError && err.isOperational) {
    // Operational errors are expected (validation, auth, etc.)
    console.error(`[${requestId}] [${err.code}] ${err.message}`);
    fileLogger.warn(`[${err.code}] ${err.message}`, {
      requestId: requestId ?? 'unknown',
      code: err.code,
      statusCode: err.statusCode,
      path: req.originalUrl || req.url,
      method: req.method,
    });
  } else {
    // Programming or unknown errors - log full stack
    console.error(`[${requestId}] Unexpected error:`, err);
    fileLogger.error(`Unexpected error: ${err.message}`, {
      requestId: requestId ?? 'unknown',
      path: req.originalUrl || req.url,
      method: req.method,
      stack: err.stack,
    });
  }

  // Send response with request ID for tracking
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ...toErrorResponse(err),
      requestId,
    });
  } else {
    // Unknown error - send generic message
    res.status(500).json({
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
}

// Async handler wrapper to catch errors in async route handlers
// Generic type allows using with AuthenticatedRequest or other extended Request types
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}
