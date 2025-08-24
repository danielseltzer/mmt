import { Request, Response, NextFunction } from 'express';
import { Loggers } from '@mmt/logger';

const logger = Loggers.apiMiddleware();

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('API Error', { 
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Default error response
  const status = (err as any).status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}