import { Router } from 'express';
import type { Context } from '../context.js';
import { validate } from '../middleware/validate.js';
import { OperationPipelineSchema } from '@mmt/entities';
import { PipelineExecutor } from '../services/pipeline-executor.js';
import { Loggers } from '@mmt/logger';

export function pipelinesRouter(context: Context): Router {
  const router = Router();
  const executor = new PipelineExecutor(context);
  const logger = Loggers.apiRoutes();
  
  // POST /api/pipelines/execute - Execute a pipeline
  router.post('/execute',
    validate(OperationPipelineSchema, 'body'),
    async (req, res, next) => {
      try {
        const pipeline = req.body;
        logger.debug('Pipeline Request', { pipeline });
        const result = await executor.execute(pipeline);
        res.json(result);
      } catch (error) {
        logger.error('Pipeline Execution Error', { error });
        next(error);
      }
    }
  );
  
  return router;
}