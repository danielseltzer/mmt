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
import os from 'os';
import { DockerManager } from './docker-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const pidFile = path.join(os.tmpdir(), 'mmt-control.pid');
const logDir = path.join(rootDir, 'logs');
const logFile = path.join(logDir, `mmt-${new Date().toISOString().split('T')[0]}.log`);

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
  requiresQdrant?: boolean;
  qdrantPort?: number;
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
  private dockerManager: DockerManager;
  
  constructor(options: ControlOptions) {
    this.options = options;
    this.dockerManager = new DockerManager();
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Register process cleanup on exit
    const exitHandler = () => {
      this.cleanup();
    };
    
    process.on('exit', exitHandler);
    this.cleanupHandlers.push(() => process.off('exit', exitHandler));
  }
  
  /**
   * Write PID file for external process management
   */
  private writePidFile(): void {
    try {
      fs.writeFileSync(pidFile, process.pid.toString());
    } catch (err) {
      this.log(`Warning: Could not write PID file: ${err}`);
    }
  }
  
  /**
   * Remove PID file
   */
  private removePidFile(): void {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch (err) {
      // Ignore errors when removing PID file
    }
  }
  
  /**
   * Check if another instance is running
   */
  static isRunning(): boolean {
    try {
      if (!fs.existsSync(pidFile)) {
        return false;
      }
      
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
      
      // Check if process exists
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        // Process doesn't exist, clean up stale PID file
        fs.unlinkSync(pidFile);
        return false;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Stop running instance by PID
   */
  static async stopByPid(): Promise<void> {
    try {
      if (!fs.existsSync(pidFile)) {
        throw new Error('No MMT instance is running (PID file not found)');
      }
      
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
      
      // Send SIGTERM
      process.kill(pid, 'SIGTERM');
      
      // Wait for process to exit (up to 5 seconds)
      let attempts = 0;
      while (attempts < 50) {
        try {
          process.kill(pid, 0); // Check if still alive
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        } catch {
          // Process is gone
          break;
        }
      }
      
      // If still running, force kill
      if (attempts >= 50) {
        process.kill(pid, 'SIGKILL');
      }
      
      // Clean up PID file
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch (err: any) {
      if (err.code === 'ESRCH') {
        // Process already gone, just clean up PID file
        if (fs.existsSync(pidFile)) {
          fs.unlinkSync(pidFile);
        }
      } else if (err.code === 'ENOENT' && err.path === pidFile) {
        // PID file already gone, that's fine
        return;
      } else {
        throw err;
      }
    }
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
    const apiPortMatch = configContent.match(/apiPort:\s*(\d+)/);
    const webPortMatch = configContent.match(/webPort:\s*(\d+)/);
    
    // Try new format first (vaults array)
    const vaultsMatch = configContent.match(/vaults:\s*\n((?:\s+.*\n)+)/);
    let vaultPath: string;
    let indexPath: string;
    
    if (vaultsMatch) {
      // New format with vaults array - extract first vault
      const firstVaultBlock = vaultsMatch[1];
      const pathMatch = firstVaultBlock.match(/\s+path:\s*(.+)/);
      const indexMatch = firstVaultBlock.match(/\s+indexPath:\s*(.+)/);
      
      if (!pathMatch || !indexMatch) {
        throw new Error('First vault must include path and indexPath');
      }
      
      vaultPath = pathMatch[1].trim();
      indexPath = indexMatch[1].trim();
    } else {
      // Fall back to old format for backward compatibility
      const vaultMatch = configContent.match(/vaultPath:\s*(.+)/);
      const indexMatch = configContent.match(/indexPath:\s*(.+)/);
      
      if (!vaultMatch || !indexMatch) {
        throw new Error('Config must include vaults array or vaultPath/indexPath');
      }
      
      vaultPath = vaultMatch[1].trim();
      indexPath = indexMatch[1].trim();
    }
    
    if (!apiPortMatch || !webPortMatch) {
      throw new Error('Config must include apiPort and webPort');
    }
    
    // Check if Qdrant is required (similarity enabled with qdrant provider)
    const similarityMatch = configContent.match(/similarity:\s*\n((?:\s+.*\n)+)/);
    let requiresQdrant = false;
    let qdrantPort = 6333; // default
    
    if (similarityMatch) {
      const similarityBlock = similarityMatch[1];
      const enabledMatch = similarityBlock.match(/\s+enabled:\s*(true|false)/);
      const providerMatch = similarityBlock.match(/\s+provider:\s*(\w+)/);
      
      if (enabledMatch && enabledMatch[1] === 'true') {
        // Check if provider is qdrant (or not specified, defaulting to orama)
        if (providerMatch && providerMatch[1] === 'qdrant') {
          requiresQdrant = true;
          
          // Check for qdrant-specific config
          const qdrantMatch = configContent.match(/\s+qdrant:\s*\n((?:\s+.*\n)+)/);
          if (qdrantMatch) {
            const qdrantBlock = qdrantMatch[1];
            const portMatch = qdrantBlock.match(/\s+url:\s*.*:(\d+)/);
            if (portMatch) {
              qdrantPort = parseInt(portMatch[1], 10);
            }
          }
        }
      }
    }
    
    this.config = {
      vaultPath,
      indexPath,
      apiPort: parseInt(apiPortMatch[1], 10),
      webPort: parseInt(webPortMatch[1], 10),
      requiresQdrant,
      qdrantPort
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
      stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
    });
    
    // Log API server output
    apiProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => this.log(`[API] ${line}`));
    });
    
    apiProcess.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        // Check if it's actually an error or just info output to stderr
        if (line.includes('Error') || line.includes('error') || line.includes('failed') || line.includes('Failed')) {
          this.log(`[API ERROR] ${line}`);
        } else {
          this.log(`[API] ${line}`);
        }
      });
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
    
    const command = 'pnpm';
    const args = ['--filter', '@mmt/web', 'dev', '--', '--port', String(port)];
    this.log(`Executing: ${command} ${args.join(' ')} in ${rootDir}`);
    
    const webProcess = spawn(command, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        MMT_API_PORT: String(this.config.apiPort),
        FORCE_COLOR: '1' // Ensure colored output from Vite
      },
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
      shell: true,
      detached: false // Don't detach - we want to manage the process lifecycle
    });
    
    // Flag to track when server is ready
    let serverReady = false;
    
    // Log web server output
    webProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n').filter(line => line.trim());
      lines.forEach(line => this.log(`[WEB] ${line}`));
      
      // Check for Vite ready message
      if (!serverReady && (output.includes('ready in') || output.includes('Local:'))) {
        serverReady = true;
        webProcess.emit('ready');
      }
    });
    
    webProcess.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        // Check if it's actually an error or just info output to stderr
        if (line.includes('Error') || line.includes('error') || line.includes('failed') || line.includes('Failed')) {
          this.log(`[WEB ERROR] ${line}`);
        } else {
          this.log(`[WEB] ${line}`);
        }
      });
    });
    
    // Handle process errors
    webProcess.on('error', (err) => {
      console.error('[Web Error] Failed to start:', err);
    });
    
    webProcess.on('exit', (code, signal) => {
      this.log(`[WEB] Process exited with code ${code}, signal ${signal}`);
      if (code !== 0 && code !== null) {
        console.error(`[Web Error] Process exited unexpectedly with code ${code}`);
        // Log additional diagnostic info
        const managed = this.processes.get('web');
        this.log(`[WEB] Exit diagnostic: PID was ${webProcess.pid}, uptime was ${Date.now() - (managed?.startTime || Date.now())}ms`);
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
    // Check if already running
    if (MMTControlManager.isRunning()) {
      throw new Error('MMT is already running. Use "mmt stop" first.');
    }
    
    // Write PID file
    this.writePidFile();
    
    // Start Qdrant if required
    if (this.config?.requiresQdrant) {
      this.log('Config requires Qdrant provider, starting Docker container...');
      try {
        await this.dockerManager.startQdrant({
          enabled: true,
          port: this.config.qdrantPort
        });
      } catch (error) {
        this.log(`Warning: Failed to start Qdrant: ${error}`);
        // Don't fail the whole startup, let the API handle the missing service
      }
    }
    
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
    
    // Stop Qdrant if it was started
    if (this.config?.requiresQdrant) {
      try {
        await this.dockerManager.stopQdrant();
      } catch (error) {
        this.log(`Warning: Failed to stop Qdrant: ${error}`);
      }
    }
    
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
    const managed = this.processes.get('web');
    if (!managed) {
      throw new Error('Web process not found');
    }
    
    const startTime = Date.now();
    let serverReady = false;
    let viteOutputReceived = false;
    
    // Set up listener for Vite output
    const readyHandler = () => {
      viteOutputReceived = true;
    };
    managed.process.once('ready', readyHandler);
    
    // Poll for both Vite output and port availability
    while (Date.now() - startTime < timeout) {
      // Check if process died
      if (managed.process.exitCode !== null) {
        throw new Error(`Web process exited with code ${managed.process.exitCode}`);
      }
      
      // Check if port is listening AND we've seen Vite output
      if (viteOutputReceived && await this.isPortInUse(port)) {
        // Double check with a small delay to ensure stability
        await new Promise(resolve => setTimeout(resolve, 500));
        if (await this.isPortInUse(port)) {
          this.log(`✓ web server is ready (port ${port} is listening)`);
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Timeout reached
    throw new Error(`Web server did not become ready within ${timeout}ms (viteOutput: ${viteOutputReceived}, portOpen: ${await this.isPortInUse(port)})`);
  }
  
  /**
   * Check if a port is in use
   */
  private async isPortInUse(port: number): Promise<boolean> {
    // Try multiple addresses as some servers only bind to specific interfaces
    const addresses = ['127.0.0.1', 'localhost', '::1'];
    
    for (const address of addresses) {
      const inUse = await this.checkPortAtAddress(port, address);
      if (inUse) {
        return true;
      }
    }
    
    return false;
  }
  
  private async checkPortAtAddress(port: number, address: string): Promise<boolean> {
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

      socket.connect(port, address);
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
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [MMT Control] ${message}`;
    
    // Always write to log file
    try {
      fs.appendFileSync(logFile, logMessage + '\n');
    } catch (err) {
      // If we can't write to log file, at least print to console
      console.error('Failed to write to log file:', err);
    }
    
    // Also write to console unless silent
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
    
    // Remove PID file
    this.removePidFile();
    
    // Remove event handlers
    for (const handler of this.cleanupHandlers) {
      handler();
    }
  }
}