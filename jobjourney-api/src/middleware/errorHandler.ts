import { Request, Response, NextFunction } from 'express';
import { AppError, toErrorResponse } from '../utils/errors';

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
  } else {
    // Programming or unknown errors - log full stack
    console.error(`[${requestId}] Unexpected error:`, err);
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
