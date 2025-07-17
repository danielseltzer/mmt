/**
 * @mmt/scripting - Declarative scripting API for markdown vault operations
 * 
 * This package provides the core infrastructure for executing MMT scripts,
 * which are declarative units of work that define operation pipelines.
 */

export { Script } from './script.interface.js';
export { ScriptRunner, type ScriptRunnerOptions } from './script-runner.js';
export { ResultFormatter, type FormatOptions } from './result-formatter.js';
export { AnalysisRunner } from './analysis-runner.js';
export { MarkdownReportGenerator, type ReportGenerationOptions } from './markdown-report-generator.js';

// Re-export Arquero for script usage
export { aq } from './analysis-pipeline.js';

// Re-export relevant types from entities for convenience
export type {
  OperationPipeline,
  ScriptContext,
  ScriptExecutionResult as ExecutionResult,
  ExecutionOptions,
  ExecuteOptions,
  SelectCriteria,
  ScriptOperation as Operation,
  OperationType,
  OutputFormat,
  OutputConfig,
  OperationReadyDocumentSet,
  ToDocumentSetOptions,
} from '@mmt/entities';