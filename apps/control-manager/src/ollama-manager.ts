/**
 * Ollama Service Manager for MMT
 * Manages Ollama service lifecycle for similarity search testing
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { Loggers, type Logger } from '@mmt/logger';
import { NodeFileSystem } from '@mmt/filesystem-access';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const ollamaPidFile = path.join(os.tmpdir(), 'mmt-ollama.pid');

export interface OllamaConfig {
  host?: string;
  port?: number;
  model?: string;
}

export class OllamaManager {
  private process: ChildProcess | null = null;
  private logger: Logger;
  private fs: NodeFileSystem;
  private config: OllamaConfig;
  
  constructor(config: OllamaConfig = {}) {
    this.logger = Loggers.control();
    this.fs = new NodeFileSystem();
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 11434,
      model: config.model || 'nomic-embed-text'
    };
  }
  
  /**
   * Check if Ollama is installed
   */
  static isOllamaInstalled(): boolean {
    try {
      execSync('ollama --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if Ollama is already running
   */
  static async isOllamaRunning(port = 11434): Promise<boolean> {
    try {
      // Using localhost for local service management - in production this would come from config
    const response = await fetch(`http://localhost:${port}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if a specific model is available
   */
  static async isModelAvailable(model: string, port = 11434): Promise<boolean> {
    try {
      // Using localhost for local service management - in production this would come from config
    const response = await fetch(`http://localhost:${port}/api/tags`);
      if (!response.ok) return false;
      
      const data = await response.json();
      const models = data.models || [];
      return models.some((m: any) => m.name === model || m.name === `${model}:latest`);
    } catch {
      return false;
    }
  }
  
  /**
   * Get list of available models
   */
  static async getAvailableModels(port = 11434): Promise<string[]> {
    try {
      // Using localhost for local service management - in production this would come from config
    const response = await fetch(`http://localhost:${port}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      const models = data.models || [];
      return models.map((m: any) => m.name);
    } catch {
      return [];
    }
  }
  
  /**
   * Pull a model if not available
   */
  async pullModel(model: string): Promise<void> {
    this.logger.info(`Checking if model ${model} is available...`);
    
    if (await OllamaManager.isModelAvailable(model, this.config.port)) {
      this.logger.info(`Model ${model} is already available`);
      return;
    }
    
    this.logger.info(`Pulling model ${model}... This may take a while.`);
    
    try {
      // Pull the model synchronously so we can see progress
      execSync(`ollama pull ${model}`, { 
        stdio: 'inherit',
        env: {
          ...process.env,
          OLLAMA_HOST: `${this.config.host}:${this.config.port}`
        }
      });
      this.logger.info(`Successfully pulled model ${model}`);
    } catch (error) {
      throw new Error(`Failed to pull model ${model}: ${error}`);
    }
  }
  
  /**
   * Check if another instance is managed by us
   */
  static isManagedInstance(): boolean {
    const fs = new NodeFileSystem();
    try {
      if (!fs.existsSync(ollamaPidFile)) {
        return false;
      }
      
      const pid = parseInt(fs.readFileSync(ollamaPidFile, 'utf-8'));
      
      // Check if process exists
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        // Process doesn't exist, clean up stale PID file
        fs.unlinkSync(ollamaPidFile);
        return false;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Start Ollama service
   */
  async start(): Promise<void> {
    // Check if Ollama is installed
    if (!OllamaManager.isOllamaInstalled()) {
      throw new Error(
        'Ollama is not installed. Please install Ollama from https://ollama.ai\n' +
        'On macOS: brew install ollama\n' +
        'On Linux: curl -fsSL https://ollama.ai/install.sh | sh'
      );
    }
    
    // Check if already running
    if (await OllamaManager.isOllamaRunning(this.config.port)) {
      this.logger.info(`Ollama is already running on port ${this.config.port}`);
      
      // Check if the required model is available
      if (!await OllamaManager.isModelAvailable(this.config.model!, this.config.port)) {
        await this.pullModel(this.config.model!);
      }
      return;
    }
    
    // Check if we have a managed instance
    if (OllamaManager.isManagedInstance()) {
      this.logger.warn('Found stale managed Ollama instance, cleaning up...');
      await this.stop();
    }
    
    this.logger.info(`Starting Ollama service on port ${this.config.port}...`);
    
    // Start Ollama serve - properly detached
    this.process = spawn('ollama', ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: `${this.config.host}:${this.config.port}`,
        OLLAMA_MODELS: path.join(os.homedir(), '.ollama', 'models')
      },
      stdio: ['ignore', 'ignore', 'ignore'],  // Fully detach stdio
      detached: true  // Run in separate process group
    });
    
    // Unref the process so it can continue after parent exits
    this.process.unref();
    
    // Note: We can't capture output when fully detached
    // The process will run independently
    
    // Handle process exit (may not fire if fully detached)
    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.logger.error(`Ollama process exited with code ${code}`);
      }
      this.process = null;
      this.removePidFile();
    });
    
    // Write PID file
    if (this.process.pid) {
      this.writePidFile(this.process.pid);
    }
    
    // Wait for Ollama to be ready
    await this.waitForReady();
    
    // Ensure the required model is available
    if (!await OllamaManager.isModelAvailable(this.config.model!, this.config.port)) {
      await this.pullModel(this.config.model!);
    }
    
    this.logger.info(`✓ Ollama service started successfully on port ${this.config.port}`);
  }
  
  /**
   * Stop Ollama service
   */
  async stop(): Promise<void> {
    // First try to stop our managed process
    if (this.process) {
      this.logger.info('Stopping managed Ollama process...');
      this.process.kill('SIGTERM');
      
      // Give it time to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
      this.process = null;
    }
    
    // Check if there's a PID file
    if (this.fs.existsSync(ollamaPidFile)) {
      try {
        const pid = parseInt(this.fs.readFileSync(ollamaPidFile, 'utf-8'));
        
        // Try to kill the process
        try {
          process.kill(pid, 'SIGTERM');
          this.logger.info(`Stopped Ollama process ${pid}`);
          
          // Give it time to shut down
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Force kill if still running
          try {
            process.kill(pid, 0);
            process.kill(pid, 'SIGKILL');
            this.logger.info(`Force killed Ollama process ${pid}`);
          } catch {
            // Process is gone
          }
        } catch (err: any) {
          if (err.code !== 'ESRCH') {
            this.logger.warn(`Could not stop Ollama process: ${err.message}`);
          }
        }
      } catch (err) {
        this.logger.warn(`Could not read PID file: ${err}`);
      }
      
      this.removePidFile();
    }
    
    // Note: We don't stop externally started Ollama instances
    // as they might be used by other applications
    if (await OllamaManager.isOllamaRunning(this.config.port)) {
      this.logger.info('Note: Ollama is still running (started externally)');
    } else {
      this.logger.info('✓ Ollama service stopped');
    }
  }
  
  /**
   * Get Ollama health status
   */
  async getHealth(): Promise<{ healthy: boolean; error?: string; models?: string[] }> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/tags`);
      if (response.ok) {
        const models = await OllamaManager.getAvailableModels(this.config.port);
        return { 
          healthy: true,
          models 
        };
      }
      return { healthy: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }
  
  /**
   * Wait for Ollama to be ready
   */
  private async waitForReady(maxAttempts = 30): Promise<void> {
    this.logger.info('Waiting for Ollama to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      if (await OllamaManager.isOllamaRunning(this.config.port)) {
        return;
      }
      
      // Check if process died
      if (this.process && this.process.exitCode !== null) {
        throw new Error(`Ollama process exited with code ${this.process.exitCode}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Ollama failed to start within ${maxAttempts} seconds`);
  }
  
  /**
   * Write PID file
   */
  private writePidFile(pid: number): void {
    try {
      this.fs.writeFileSync(ollamaPidFile, pid.toString());
    } catch (err) {
      this.logger.warn(`Could not write PID file: ${err}`);
    }
  }
  
  /**
   * Remove PID file
   */
  private removePidFile(): void {
    try {
      if (this.fs.existsSync(ollamaPidFile)) {
        this.fs.unlinkSync(ollamaPidFile);
      }
    } catch (err) {
      // Ignore errors when removing PID file
    }
  }
}