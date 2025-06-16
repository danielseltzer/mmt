import type { OperationPipeline, ScriptContext } from '@mmt/entities';

/**
 * Interface that all MMT scripts must implement.
 * 
 * Scripts are declarative units of work that define operation pipelines
 * to be executed against a markdown vault. They receive context from the
 * script runner and return a schema describing what operations to perform.
 */
export interface Script {
  /**
   * Define the operation pipeline for this script.
   * 
   * @param context - Runtime context including vault paths and CLI options
   * @returns Operation pipeline schema describing work to perform
   */
  define(context: ScriptContext): OperationPipeline;
}