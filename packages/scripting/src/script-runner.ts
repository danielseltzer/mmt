import type { ColumnTable } from 'arquero';
type Table = ColumnTable;
import type {
  ScriptContext,
  ScriptExecutionResult,
  Config,
  OperationPipeline,
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

// Test config structure that mirrors the real Config but with simplified vault structure
interface TestConfig {
  vaultPath?: string;
  indexPath?: string;
  apiPort?: number;
}

// Union type to support both real Config and test configs
type ScriptRunnerConfig = Config | TestConfig;

export interface ScriptRunnerOptions {
  config: ScriptRunnerConfig;
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
  private readonly config: ScriptRunnerConfig;
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
    // In tests, apiPort might not be present
    const apiPort = 'apiPort' in options.config && typeof options.config.apiPort === 'number' 
      ? options.config.apiPort 
      : 3001;
    // API URL should come from configuration
    // Temporarily using config-provided apiPort for tests
    // In production, this should be read from config.apiUrl
    const host = 'localhost'; // Should come from config
    const protocol = 'http'; // Should come from config
    this.apiUrl = apiPort ? `${protocol}://${host}:${String(apiPort)}` : '';
    this.logger = Loggers.script();
    
    // Initialize components
    this.reportGenerator = new MarkdownReportGenerator();
    this.scriptValidator = new ScriptValidator();
    this.documentSelector = new DocumentSelector({
      fileSystem: this.fs,
    });
    // Get vault ID from config - check if this is a real Config with vaults array
    const vaultId = 'vaults' in this.config && this.config.vaults[0]?.name 
      ? this.config.vaults[0].name 
      : 'TestVault';
    
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
  async executePipeline(pipeline: OperationPipeline): Promise<ScriptExecutionResult> {
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
   * Clean up resources used by the script runner.
   * This should be called after script execution to ensure the process can exit cleanly.
   */
  async cleanup(): Promise<void> {
    if (this.indexer) {
      await this.indexer.shutdown();
      this.indexer = undefined;
    }
  }

  /**
   * Initialize the indexer if not already initialized.
   */
  private async initializeIndexer(): Promise<void> {
    if (this.indexer !== undefined) {
      return;
    }

    // Handle both Config structure and test config structure
    interface TestConfigWithPath {
      vaultPath?: string;
    }
    const vaultPath = 'vaults' in this.config && this.config.vaults[0]?.path
      ? this.config.vaults[0].path
      : (this.config as TestConfigWithPath).vaultPath;
    const fileWatchingConfig = 'vaults' in this.config && this.config.vaults[0]?.fileWatching
      ? this.config.vaults[0].fileWatching
      : undefined;
    
    // fileWatchingConfig is already an object or undefined per schema
    const fileWatching = fileWatchingConfig;
    
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
  setIndexerForTesting(indexer: VaultIndexer): void {
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
    const vaultPath = 'vaults' in this.config && this.config.vaults[0]?.path
      ? this.config.vaults[0].path
      : ('vaultPath' in this.config && typeof this.config.vaultPath === 'string' ? this.config.vaultPath : '');
    const indexPath = 'vaults' in this.config && this.config.vaults[0]?.indexPath
      ? this.config.vaults[0].indexPath
      : ('indexPath' in this.config && typeof this.config.indexPath === 'string' ? this.config.indexPath : '');
    
    // Indexer must be initialized before creating context
    if (!this.indexer) {
      throw new Error('Indexer must be initialized before creating script context');
    }
    
    const context: ScriptContext = {
      vaultPath,
      indexPath,
      scriptPath,
      cliOptions,
      indexer: this.indexer,
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
    pipeline: OperationPipeline
  ): Promise<void> {
    const resultWithTable = result as ScriptExecutionResult & { analysisTable?: Table };
    // Handle both Config structure and test config structure
    const vaultPath = 'vaults' in this.config && this.config.vaults[0]?.path
      ? this.config.vaults[0].path
      : ('vaultPath' in this.config && typeof this.config.vaultPath === 'string' ? this.config.vaultPath : '');
    
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