import { pathToFileURL } from 'url';
import { OperationPipelineSchema } from '@mmt/entities';
import type { OperationPipeline } from '@mmt/entities';
import type { Script } from './script.interface.js';

/**
 * Handles validation and loading of MMT scripts.
 */
export class ScriptValidator {
  /**
   * Load a script module from a file path.
   */
  async loadScript(scriptPath: string): Promise<Script> {
    try {
      // Convert to file URL for ES module import
      const fileUrl = pathToFileURL(scriptPath).href;
      const module = await import(fileUrl) as { default?: Script | (new () => Script) };
      
      // Check for default export
      if (module.default === undefined) {
        throw new Error(`Script ${scriptPath} must have a default export`);
      }

      // Instantiate if it's a class, otherwise use as-is
      const scriptExport = module.default;
      let script: Script;
      
      if (typeof scriptExport === 'function') {
        // It's a constructor, instantiate it
        const ScriptConstructor = scriptExport;
        script = new ScriptConstructor();
      } else {
        script = scriptExport;
      }

      // Validate it implements Script interface
      if (!this.isValidScript(script)) {
        throw new Error(`Script ${scriptPath} must implement Script interface with define() method`);
      }

      return script;
    } catch (error) {
      throw new Error(`Failed to load script ${scriptPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate a pipeline definition.
   */
  validatePipeline(pipeline: unknown): OperationPipeline {
    return OperationPipelineSchema.parse(pipeline);
  }

  /**
   * Update pipeline with CLI execution options.
   */
  applyCliOptions(
    pipeline: OperationPipeline, 
    cliOptions: Record<string, unknown>
  ): OperationPipeline {
    if (cliOptions.execute === true) {
      pipeline.options = {
        destructive: true,
        confirmCount: false,
        continueOnError: false,
        ...pipeline.options,
      };
    }
    return pipeline;
  }

  /**
   * Type guard to check if an object implements the Script interface.
   */
  private isValidScript(obj: unknown): obj is Script {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      'define' in obj &&
      typeof (obj as Script).define === 'function'
    );
  }
}