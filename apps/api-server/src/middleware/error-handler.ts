import { Request, Response, NextFunction } from 'express';
import { Loggers } from '@mmt/logger';
import { isMmtError, toMmtError, MmtError } from '@mmt/entities';

const logger = Loggers.apiMiddleware();

/**
 * Global error handling middleware for the API server
 * Converts all errors to standardized MmtError format
 */
export function errorHandler(
  err: Error | MmtError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Convert to MmtError for consistent handling
  const mmtError = toMmtError(err);
  
  // Log the error with full context
  logger.error('API Error', { 
    message: mmtError.message,
    code: mmtError.code,
    statusCode: mmtError.statusCode,
    details: mmtError.details,
    stack: mmtError.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params,
    body: req.body,
    timestamp: mmtError.timestamp
  });
  
  // Prepare error response
  const errorResponse: Record<string, unknown> = {
    error: {
      message: mmtError.message,
      code: mmtError.code,
      timestamp: mmtError.timestamp
    }
  };

  // Include details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error = {
      ...(errorResponse.error as Record<string, unknown>),
      details: mmtError.details,
      stack: mmtError.stack,
      path: req.path,
      method: req.method
    };
  }

  // Send error response
  res.status(mmtError.statusCode).json(errorResponse);
}