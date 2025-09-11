/**
 * Test Service Manager for MMT
 * Orchestrates test services (Ollama and Qdrant) for similarity search testing
 */

import { OllamaManager } from './ollama-manager.js';
import { DockerManager } from './docker-manager.js';
import { Loggers, type Logger } from '@mmt/logger';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { NodeFileSystem } from '@mmt/filesystem-access';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const statusFile = path.join(os.tmpdir(), 'mmt-test-services.json');

export interface TestServiceConfig {
  ollama?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    model?: string;
  };
  qdrant?: {
    enabled?: boolean;
    port?: number;
    grpcPort?: number;
    storagePath?: string;
  };
}

export interface ServiceStatus {
  ollama: {
    running: boolean;
    healthy?: boolean;
    error?: string;
    models?: string[];
    managedByUs?: boolean;
  };
  qdrant: {
    running: boolean;
    healthy?: boolean;
    error?: string;
    containerStatus?: string;
  };
  timestamp: string;
}

export class TestServiceManager {
  private ollamaManager: OllamaManager;
  private dockerManager: DockerManager;
  private logger: Logger;
  private fs: NodeFileSystem;
  private config: TestServiceConfig;
  
  constructor(config: TestServiceConfig = {}) {
    this.logger = Loggers.control();
    this.fs = new NodeFileSystem();
    this.dockerManager = new DockerManager();
    
    // Set defaults
    this.config = {
      ollama: {
        enabled: config.ollama?.enabled !== false,
        host: config.ollama?.host || 'localhost',
        port: config.ollama?.port || 11434,
        model: config.ollama?.model || 'nomic-embed-text'
      },
      qdrant: {
        enabled: config.qdrant?.enabled !== false,
        port: config.qdrant?.port || 6333,
        grpcPort: config.qdrant?.grpcPort || 6334,
        storagePath: config.qdrant?.storagePath || path.join(rootDir, 'qdrant_storage')
      }
    };
    
    this.ollamaManager = new OllamaManager(this.config.ollama);
  }
  
  /**
   * Start all test services
   */
  async startAll(): Promise<void> {
    this.logger.info('Starting test services for similarity search...');
    
    const errors: string[] = [];
    
    // Start Qdrant if enabled
    if (this.config.qdrant?.enabled) {
      try {
        this.logger.info('Starting Qdrant...');
        await this.dockerManager.startQdrant(this.config.qdrant);
        this.logger.info('✓ Qdrant started successfully');
      } catch (error) {
        const message = `Failed to start Qdrant: ${error}`;
        this.logger.error(message);
        errors.push(message);
      }
    }
    
    // Start Ollama if enabled
    if (this.config.ollama?.enabled) {
      try {
        this.logger.info('Starting Ollama...');
        await this.ollamaManager.start();
        this.logger.info('✓ Ollama started successfully');
      } catch (error) {
        const message = `Failed to start Ollama: ${error}`;
        this.logger.error(message);
        errors.push(message);
      }
    }
    
    // Save status
    await this.saveStatus();
    
    if (errors.length > 0) {
      throw new Error(`Some services failed to start:\n${errors.join('\n')}`);
    }
    
    this.logger.info('✓ All test services started successfully');
  }
  
  /**
   * Stop all test services
   */
  async stopAll(): Promise<void> {
    this.logger.info('Stopping test services...');
    
    const errors: string[] = [];
    
    // Stop Ollama
    if (this.config.ollama?.enabled) {
      try {
        await this.ollamaManager.stop();
        this.logger.info('✓ Ollama stopped');
      } catch (error) {
        const message = `Failed to stop Ollama: ${error}`;
        this.logger.error(message);
        errors.push(message);
      }
    }
    
    // Stop Qdrant
    if (this.config.qdrant?.enabled) {
      try {
        await this.dockerManager.stopQdrant();
        this.logger.info('✓ Qdrant stopped');
      } catch (error) {
        const message = `Failed to stop Qdrant: ${error}`;
        this.logger.error(message);
        errors.push(message);
      }
    }
    
    // Remove status file
    this.removeStatusFile();
    
    if (errors.length > 0) {
      this.logger.warn('Some services had issues stopping, but cleanup completed');
    } else {
      this.logger.info('✓ All test services stopped successfully');
    }
  }
  
  /**
   * Get status of all test services
   */
  async getStatus(): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      ollama: {
        running: false
      },
      qdrant: {
        running: false
      },
      timestamp: new Date().toISOString()
    };
    
    // Check Ollama status
    status.ollama.running = await OllamaManager.isOllamaRunning(this.config.ollama?.port);
    if (status.ollama.running) {
      const health = await this.ollamaManager.getHealth();
      status.ollama.healthy = health.healthy;
      status.ollama.error = health.error;
      status.ollama.models = health.models;
      status.ollama.managedByUs = OllamaManager.isManagedInstance();
    }
    
    // Check Qdrant status
    if (DockerManager.isDockerAvailable()) {
      const containerStatus = DockerManager.getContainerStatus('mmt-qdrant');
      status.qdrant.running = containerStatus === 'running';
      status.qdrant.containerStatus = containerStatus;
      
      if (status.qdrant.running) {
        const health = await DockerManager.getQdrantHealth(this.config.qdrant?.port);
        status.qdrant.healthy = health.healthy;
        status.qdrant.error = health.error;
      }
    } else {
      status.qdrant.error = 'Docker not available';
    }
    
    return status;
  }
  
  /**
   * Check if services are ready for testing
   */
  async checkReadiness(): Promise<{ ready: boolean; issues: string[] }> {
    const issues: string[] = [];
    const status = await this.getStatus();
    
    // Check Ollama
    if (this.config.ollama?.enabled) {
      if (!status.ollama.running) {
        issues.push('Ollama is not running');
      } else if (!status.ollama.healthy) {
        issues.push(`Ollama is unhealthy: ${status.ollama.error || 'Unknown error'}`);
      } else if (status.ollama.models && !status.ollama.models.some(m => 
        m === this.config.ollama?.model || 
        m === `${this.config.ollama?.model}:latest`
      )) {
        issues.push(`Required model ${this.config.ollama?.model} is not available`);
      }
    }
    
    // Check Qdrant
    if (this.config.qdrant?.enabled) {
      if (!DockerManager.isDockerAvailable()) {
        issues.push('Docker is not available');
      } else if (!status.qdrant.running) {
        issues.push('Qdrant is not running');
      } else if (!status.qdrant.healthy) {
        issues.push(`Qdrant is unhealthy: ${status.qdrant.error || 'Unknown error'}`);
      }
    }
    
    return {
      ready: issues.length === 0,
      issues
    };
  }
  
  /**
   * Check if services need to be started and provide clear instructions
   * @returns true if services are ready, false if they need to be started
   */
  static async checkAndAdvise(): Promise<boolean> {
    const logger = Loggers.control();
    const manager = new TestServiceManager();
    const readiness = await manager.checkReadiness();
    
    if (!readiness.ready) {
      logger.info('Test services are not ready.');
      logger.info(`Issues found: ${readiness.issues.join(', ')}`);
      logger.info('\nTo start test services, run: ./bin/mmt test:start');
      return false;
    }
    
    logger.info('✓ Test services are already running and healthy');
    return true;
  }
  
  /**
   * Format status for display
   */
  static formatStatus(status: ServiceStatus): string {
    const lines: string[] = [];
    
    lines.push('Test Service Status:');
    lines.push('====================');
    
    // Ollama status
    lines.push('\nOllama:');
    if (status.ollama.running) {
      lines.push(`  Status: Running${status.ollama.managedByUs ? ' (managed by MMT)' : ' (external)'}`);
      lines.push(`  Health: ${status.ollama.healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
      if (status.ollama.error) {
        lines.push(`  Error: ${status.ollama.error}`);
      }
      if (status.ollama.models && status.ollama.models.length > 0) {
        lines.push(`  Available models: ${status.ollama.models.join(', ')}`);
      } else {
        lines.push('  Available models: None');
      }
    } else {
      lines.push('  Status: Not running');
    }
    
    // Qdrant status
    lines.push('\nQdrant:');
    if (status.qdrant.containerStatus === 'not_found') {
      lines.push('  Status: Not found');
    } else if (status.qdrant.running) {
      lines.push('  Status: Running');
      lines.push(`  Health: ${status.qdrant.healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
      if (status.qdrant.error) {
        lines.push(`  Error: ${status.qdrant.error}`);
      }
    } else if (status.qdrant.containerStatus === 'stopped') {
      lines.push('  Status: Stopped (container exists)');
    } else {
      lines.push(`  Status: ${status.qdrant.error || 'Not available'}`);
    }
    
    lines.push(`\nLast checked: ${new Date(status.timestamp).toLocaleString()}`);
    
    return lines.join('\n');
  }
  
  /**
   * Save status to file
   */
  private async saveStatus(): Promise<void> {
    try {
      const status = await this.getStatus();
      this.fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    } catch (err) {
      this.logger.warn(`Could not save status file: ${err}`);
    }
  }
  
  /**
   * Remove status file
   */
  private removeStatusFile(): void {
    try {
      if (this.fs.existsSync(statusFile)) {
        this.fs.unlinkSync(statusFile);
      }
    } catch (err) {
      // Ignore errors
    }
  }
  
  /**
   * Read last saved status
   */
  static getLastStatus(): ServiceStatus | null {
    const fs = new NodeFileSystem();
    try {
      if (fs.existsSync(statusFile)) {
        const content = fs.readFileSync(statusFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Ignore errors
    }
    return null;
  }
}