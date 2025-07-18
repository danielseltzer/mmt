import { Router } from 'express';
import type { Context } from '../context.js';
import { validate } from '../middleware/validate.js';
import { OperationPipelineSchema } from '@mmt/entities';
import { PipelineExecutor } from '../services/pipeline-executor.js';

export function pipelinesRouter(context: Context): Router {
  const router = Router();
  const executor = new PipelineExecutor(context);
  
  // POST /api/pipelines/execute - Execute a pipeline
  router.post('/execute',
    validate(OperationPipelineSchema, 'body'),
    async (req, res, next) => {
      try {
        const pipeline = req.body;
        const result = await executor.execute(pipeline);
        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );
  
  return router;
}