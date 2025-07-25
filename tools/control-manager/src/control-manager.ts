/**
 * MMT Control Manager
 * Manages API and Web servers for development and testing
 * Inspired by QM's control manager patterns
 */

import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

interface ManagedProcess {
  process: ChildProcess;
  name: string;
  port: number;
  startTime: number;
}

interface MMTConfig {
  vaultPath: string;
  indexPath: string;
  apiPort: number;
  webPort: number;
}

export interface ControlOptions {
  configPath: string;
  silent?: boolean;
}

export class MMTControlManager {
  private processes = new Map<string, ManagedProcess>();
  private config: MMTConfig | null = null;
  private options: ControlOptions;
  private cleanupHandlers: (() => void)[] = [];
  
  constructor(options: ControlOptions) {
    this.options = options;
    
    // Register process cleanup on exit
    const exitHandler = () => {
      this.cleanup();
    };
    
    process.on('exit', exitHandler);
    this.cleanupHandlers.push(() => process.off('exit', exitHandler));
  }
  
  /**
   * Initialize with config
   */
  async init(configPath?: string): Promise<void> {
    const configFile = configPath || this.options.configPath;
    if (!configFile || !fs.existsSync(configFile)) {
      throw new Error('Config file is required and must exist');
    }
    
    const configContent = fs.readFileSync(configFile, 'utf-8');
    // Simple YAML parsing for our basic needs
    const vaultMatch = configContent.match(/vaultPath:\s*(.+)/);
    const indexMatch = configContent.match(/indexPath:\s*(.+)/);
    const apiPortMatch = configContent.match(/apiPort:\s*(\d+)/);
    const webPortMatch = configContent.match(/webPort:\s*(\d+)/);
    
    if (!vaultMatch || !indexMatch || !apiPortMatch || !webPortMatch) {
      throw new Error('Config must include vaultPath, indexPath, apiPort, and webPort');
    }
    
    this.config = {
      vaultPath: vaultMatch[1].trim(),
      indexPath: indexMatch[1].trim(),
      apiPort: parseInt(apiPortMatch[1], 10),
      webPort: parseInt(webPortMatch[1], 10)
    };
  }
  
  /**
   * Start the API server
   */
  async startAPI(): Promise<void> {
    if (!this.config) {
      throw new Error('Must call init() before starting servers');
    }
    const port = this.config.apiPort;
    
    // Check if already running - fail fast
    if (await this.isPortInUse(port)) {
      throw new Error(`Port ${port} is already in use. Cannot start API server.`);
    }
    
    this.log(`Starting API server on port ${port}...`);
    
    const env = { ...process.env };
    
    // Build the API server if needed
    const serverPath = path.join(rootDir, 'apps/api-server/dist/server.js');
    if (!fs.existsSync(serverPath)) {
      this.log('API server not built, building now...');
      const buildProcess = spawn('pnpm', ['--filter', '@mmt/api-server', 'build'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true
      });
      
      await new Promise<void>((resolve, reject) => {
        buildProcess.on('exit', (code) => {
          if (code === 0) {
            this.log('API server built successfully');
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });
    }
    
    const args = [serverPath];
    if (this.options.configPath) {
      // Resolve config path to absolute
      const absoluteConfigPath = path.isAbsolute(this.options.configPath) 
        ? this.options.configPath 
        : path.join(rootDir, this.options.configPath);
      args.push('--config', absoluteConfigPath);
    }
    
    const apiProcess = spawn('node', args, {
      cwd: rootDir,
      env,
      stdio: 'inherit' // Always show output for debugging
    });
    
    // Handle process errors
    apiProcess.on('error', (err) => {
      console.error('[API Error] Failed to start:', err);
    });
    
    apiProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[API Error] Process exited with code ${code}`);
      }
      this.processes.delete('api');
    });
    
    this.processes.set('api', {
      process: apiProcess,
      name: 'API Server',
      port,
      startTime: Date.now()
    });
    
    // Wait for API to be ready
    try {
      await this.waitForReady('api', port);
    } catch (error) {
      // Clean up the process if it fails to start
      await this.stop('api');
      throw error;
    }
  }
  
  /**
   * Start the web dev server
   */
  async startWeb(): Promise<void> {
    if (!this.config) {
      throw new Error('Must call init() before starting servers');
    }
    const port = this.config.webPort;
    
    // Check if already running - fail fast
    if (await this.isPortInUse(port)) {
      throw new Error(`Port ${port} is already in use. Cannot start web server.`);
    }
    
    this.log(`Starting web server on port ${port}...`);
    
    const webProcess = spawn('pnpm', ['--filter', '@mmt/web', 'dev', '--', '--port', String(port)], {
      cwd: rootDir,
      env: {
        ...process.env,
        MMT_API_PORT: String(this.config.apiPort)
      },
      stdio: 'inherit', // Always show output for debugging
      shell: true
    });
    
    // Handle process errors
    webProcess.on('error', (err) => {
      console.error('[Web Error] Failed to start:', err);
    });
    
    webProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[Web Error] Process exited with code ${code}`);
      }
      this.processes.delete('web');
    });
    
    this.processes.set('web', {
      process: webProcess,
      name: 'Web Server',
      port,
      startTime: Date.now()
    });
    
    // Wait for web server to be ready
    try {
      await this.waitForWebReady(port);
    } catch (error) {
      // Clean up the process if it fails to start
      await this.stop('web');
      throw error;
    }
  }
  
  /**
   * Start both servers
   */
  async startAll(): Promise<void> {
    await this.startAPI();
    await this.startWeb();
    this.log('All servers started successfully!');
  }
  
  /**
   * Stop a specific server
   */
  async stop(service: 'api' | 'web'): Promise<void> {
    const managed = this.processes.get(service);
    if (!managed) {
      this.log(`${service} is not managed by us`);
      return;
    }
    
    this.log(`Stopping ${managed.name}...`);
    managed.process.kill();
    this.processes.delete(service);
  }
  
  /**
   * Stop all managed servers
   */
  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Stop all processes in parallel
    for (const [name] of this.processes.entries()) {
      promises.push(this.stop(name as 'api' | 'web'));
    }
    
    // Wait for all to complete, but don't fail if some error
    await Promise.allSettled(promises);
    
    // Force kill any remaining processes
    for (const [name, managed] of this.processes.entries()) {
      try {
        if (!managed.process.killed) {
          this.log(`Force killing ${managed.name}...`);
          managed.process.kill('SIGKILL');
        }
      } catch (err) {
        // Process might already be dead
      }
      this.processes.delete(name);
    }
  }
  
  /**
   * Wait for API server to be ready
   */
  private async waitForReady(service: string, port: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    const managed = this.processes.get(service);
    
    while (Date.now() - startTime < timeout) {
      // Check if process died
      if (managed && managed.process.exitCode !== null) {
        throw new Error(`${service} process exited with code ${managed.process.exitCode}`);
      }
      
      if (await this.isPortInUse(port)) {
        // For API, also check health endpoint
        if (service === 'api') {
          try {
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(`http://localhost:${port}/health`);
            if (response.ok) {
              this.log(`✓ ${service} is ready`);
              return;
            }
          } catch {
            // Not ready yet
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Timeout reached - kill the process before throwing
    if (managed) {
      this.log(`${service} timeout - killing process`);
      managed.process.kill();
      this.processes.delete(service);
    }
    
    throw new Error(`${service} did not become ready within ${timeout}ms`);
  }
  
  /**
   * Wait for web server to be ready (Vite specific)
   */
  private async waitForWebReady(port: number, timeout = 60000): Promise<void> {
    const startTime = Date.now();
    const managed = this.processes.get('web');
    
    // For Vite, we'll consider it ready after a short delay
    // since it prints "ready" to stdout but may not immediately accept connections
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    while (Date.now() - startTime < timeout) {
      // Check if process died
      if (managed && managed.process.exitCode !== null) {
        throw new Error(`Web process exited with code ${managed.process.exitCode}`);
      }
      
      // Just check if the process is still running
      if (managed && managed.process.pid) {
        this.log(`✓ web server is ready (process running)`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Web server did not start within ${timeout}ms`);
  }
  
  /**
   * Check if a port is in use
   */
  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 500);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  }
  
  /**
   * Get URLs for services
   */
  getAPIUrl(): string {
    if (!this.config) {
      throw new Error('Must call init() before getting URLs');
    }
    return `http://localhost:${this.config.apiPort}`;
  }
  
  getWebUrl(): string {
    if (!this.config) {
      throw new Error('Must call init() before getting URLs');
    }
    return `http://localhost:${this.config.webPort}`;
  }
  
  /**
   * Log a message
   */
  private log(message: string): void {
    if (!this.options.silent) {
      console.log(`[MMT Control] ${message}`);
    }
  }
  
  /**
   * Synchronous cleanup for process exit
   */
  private cleanup(): void {
    // Kill all processes synchronously
    for (const [name, managed] of this.processes.entries()) {
      try {
        if (!managed.process.killed) {
          managed.process.kill('SIGKILL');
        }
      } catch (err) {
        // Process might already be dead
      }
    }
    
    // Remove event handlers
    for (const handler of this.cleanupHandlers) {
      handler();
    }
  }
}