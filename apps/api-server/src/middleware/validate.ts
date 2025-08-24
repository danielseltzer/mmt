import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { Loggers } from '@mmt/logger';

const logger = Loggers.apiMiddleware();

/**
 * Express middleware to validate request data against a Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : 
                 source === 'query' ? req.query : 
                 req.params;
    
    try {
      const validated = await schema.parseAsync(data);
      
      // Replace the original data with validated/transformed data
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('Validation Error', {
          source,
          data: JSON.stringify(data, null, 2),
          errors: error.errors,
          path: req.path,
          method: req.method
        });
        res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}