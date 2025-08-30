import type { ColumnTable } from 'arquero';
type Table = ColumnTable;
import type {
  ScriptContext,
  ScriptExecutionResult,
  Config,
} from '@mmt/entities';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { VaultIndexer } from '@mmt/indexer';
import { QueryParser } from '@mmt/query-parser';
import { MarkdownReportGenerator } from './markdown-report-generator.js';
import { ScriptValidator } from './script-validator.js';
import { ScriptExecutor } from './script-executor.js';
import { DocumentSelector } from './document-selector.js';
import { aq } from './analysis-pipeline.js';
import { Loggers, type Logger } from '@mmt/logger';

export interface ScriptRunnerOptions {
  config: Config;
  fileSystem: FileSystemAccess;
  queryParser: QueryParser;
  outputStream?: NodeJS.WritableStream;
}

/**
 * Executes MMT scripts by loading, validating, and running operation pipelines.
 * 
 * This class orchestrates the script execution process by coordinating between
 * the validator, executor, and document selector components.
 */
export class ScriptRunner {
  private readonly config: ScriptRunnerOptions['config'];
  private readonly fs: FileSystemAccess;
  private readonly queryParser: QueryParser;
  private readonly output: NodeJS.WritableStream;
  private readonly reportGenerator: MarkdownReportGenerator;
  private readonly scriptValidator: ScriptValidator;
  private readonly scriptExecutor: ScriptExecutor;
  private readonly documentSelector: DocumentSelector;
  private indexer?: VaultIndexer;
  private readonly apiUrl: string;
  private readonly logger: Logger;

  constructor(options: ScriptRunnerOptions) {
    this.config = options.config;
    this.fs = options.fileSystem;
    this.queryParser = options.queryParser;
    this.output = options.outputStream ?? process.stdout;
    
    // Handle both Config structure and test config structure
    const apiPort = 'apiPort' in options.config 
      ? options.config.apiPort 
      : (options.config as any).apiPort ?? 3001;
    this.apiUrl = `http://localhost:${apiPort}`;
    this.logger = Loggers.script();
    
    // Initialize components
    this.reportGenerator = new MarkdownReportGenerator();
    this.scriptValidator = new ScriptValidator();
    this.documentSelector = new DocumentSelector({
      fileSystem: this.fs,
    });
    // Get vault ID from config (use first vault's name or 'TestVault' for tests)
    const vaultId = this.config.vaults?.[0]?.name ?? 'TestVault';
    
    this.scriptExecutor = new ScriptExecutor({
      apiUrl: this.apiUrl,
      outputStream: this.output,
      documentSelector: this.documentSelector,
      vaultId,
    });
  }

  /**
   * Execute a validated operation pipeline.
   * This method is exposed for testing purposes.
   */
  async executePipeline(pipeline: any): Promise<ScriptExecutionResult> {
    return this.scriptExecutor.executePipeline(pipeline);
  }

  /**
   * Load and execute a script from a file path.
   * 
   * This is the main entry point for script execution. It handles:
   * 1. Initializing the indexer if needed
   * 2. Loading and validating the script
   * 3. Creating the script context
   * 4. Executing the pipeline
   * 5. Generating reports if requested
   */
  async runScript(scriptPath: string, cliOptions: Record<string, unknown> = {}): Promise<ScriptExecutionResult> {
    // Initialize indexer if not already done
    await this.initializeIndexer();
    
    // Load the script module
    const script = await this.scriptValidator.loadScript(scriptPath);
    
    // Create script context
    const context = this.createScriptContext(scriptPath, cliOptions);
    
    // Get pipeline definition from script
    const pipeline = script.define(context);
    
    // Validate and apply CLI options to pipeline
    let validatedPipeline = this.scriptValidator.validatePipeline(pipeline);
    validatedPipeline = this.scriptValidator.applyCliOptions(validatedPipeline, cliOptions);

    // Execute the pipeline
    const result = await this.scriptExecutor.executePipeline(validatedPipeline);
    
    // Generate report if requested
    if (this.shouldGenerateReport(cliOptions)) {
      await this.generateReport(
        scriptPath,
        cliOptions,
        result,
        validatedPipeline
      );
    }
    
    return result;
  }

  /**
   * Initialize the indexer if not already initialized.
   */
  private async initializeIndexer(): Promise<void> {
    if (this.indexer !== undefined) {
      return;
    }

    // Handle both Config structure and test config structure
    const vaultPath = this.config.vaults?.[0]?.path ?? (this.config as any).vaultPath;
    const fileWatchingConfig = this.config.vaults?.[0]?.fileWatching;
    
    // Convert boolean or object to the expected format
    const fileWatching = typeof fileWatchingConfig === 'boolean' 
      ? (fileWatchingConfig ? { enabled: true } : undefined)
      : fileWatchingConfig;
    
    this.indexer = new VaultIndexer({
      vaultPath,
      fileSystem: this.fs,
      useCache: true,
      useWorkers: true,
      fileWatching,
    });
    
    await this.indexer.initialize();
    
    // Update document selector with indexer
    this.documentSelector.setIndexer(this.indexer);
  }

  /**
   * Set the indexer instance (for testing purposes).
   * @internal
   */
  _setIndexer(indexer: VaultIndexer): void {
    this.indexer = indexer;
    this.documentSelector.setIndexer(indexer);
  }

  /**
   * Create the script context for script execution.
   */
  private createScriptContext(
    scriptPath: string,
    cliOptions: Record<string, unknown>
  ): ScriptContext & { aq: typeof aq } {
    // Handle both Config structure and test config structure
    const vaultPath = this.config.vaults?.[0]?.path ?? (this.config as any).vaultPath;
    const indexPath = this.config.vaults?.[0]?.indexPath ?? (this.config as any).indexPath;
    
    const context: ScriptContext = {
      vaultPath,
      indexPath,
      scriptPath,
      cliOptions,
      indexer: this.indexer!,
    };
    
    // Extend context with Arquero namespace for scripts
    return { ...context, aq };
  }

  /**
   * Check if a report should be generated based on CLI options.
   */
  private shouldGenerateReport(cliOptions: Record<string, unknown>): boolean {
    return cliOptions.reportPath !== undefined && cliOptions.reportPath !== null;
  }

  /**
   * Generate a markdown report for the script execution.
   */
  private async generateReport(
    scriptPath: string,
    cliOptions: Record<string, unknown>,
    result: ScriptExecutionResult,
    pipeline: any
  ): Promise<void> {
    const resultWithTable = result as ScriptExecutionResult & { analysisTable?: Table };
    // Handle both Config structure and test config structure
    const vaultPath = this.config.vaults?.[0]?.path ?? (this.config as any).vaultPath;
    
    await this.reportGenerator.generateReport({
      scriptPath,
      vaultPath,
      executionResult: result,
      pipeline,
      analysisTable: resultWithTable.analysisTable,
      reportPath: cliOptions.reportPath as string,
      isPreview: !pipeline.options?.destructive,
    });
  }
}