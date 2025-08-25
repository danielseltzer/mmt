/**
 * Docker Service Manager for MMT
 * Manages Docker containers required by MMT (currently Qdrant)
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Loggers } from '@mmt/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

export interface DockerServiceConfig {
  qdrant?: {
    enabled: boolean;
    port?: number;
    grpcPort?: number;
    storagePath?: string;
  };
}

export class DockerManager {
  private processes = new Map<string, ChildProcess>();
  private logger = Loggers.default();
  
  /**
   * Check if Docker is installed and running
   */
  static isDockerAvailable(): boolean {
    try {
      execSync('docker --version', { stdio: 'ignore' });
      // Check if Docker daemon is running
      execSync('docker ps', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if a container is running
   */
  static isContainerRunning(containerName: string): boolean {
    try {
      const output = execSync(
        `docker ps --filter "name=${containerName}" --format "{{.Names}}"`,
        { encoding: 'utf-8' }
      );
      return output.trim() === containerName;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if any container is using a specific port
   */
  static isPortUsedByContainer(port: number): { inUse: boolean; containerName?: string } {
    try {
      // Get all running containers with their port mappings
      const output = execSync(
        `docker ps --format "table {{.Names}}\t{{.Ports}}"`,
        { encoding: 'utf-8' }
      );
      
      const lines = output.split('\n').slice(1); // Skip header
      for (const line of lines) {
        if (line.includes(`:${port}->`)) {
          // Extract container name from the line
          const parts = line.split('\t');
          if (parts.length > 0) {
            return { inUse: true, containerName: parts[0].trim() };
          }
        }
      }
      return { inUse: false };
    } catch {
      return { inUse: false };
    }
  }
  
  /**
   * Get container status
   */
  static getContainerStatus(containerName: string): 'running' | 'stopped' | 'not_found' {
    try {
      // Check if running
      if (this.isContainerRunning(containerName)) {
        return 'running';
      }
      
      // Check if exists but stopped
      const output = execSync(
        `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`,
        { encoding: 'utf-8' }
      );
      
      if (output.trim() === containerName) {
        return 'stopped';
      }
      
      return 'not_found';
    } catch {
      return 'not_found';
    }
  }
  
  /**
   * Start Qdrant container
   */
  async startQdrant(config?: DockerServiceConfig['qdrant']): Promise<void> {
    const containerName = 'mmt-qdrant';
    const port = config?.port || 6333;
    const grpcPort = config?.grpcPort || 6334;
    const storagePath = config?.storagePath || path.join(rootDir, 'qdrant_storage');
    
    // Check if Docker is available
    if (!DockerManager.isDockerAvailable()) {
      throw new Error('Docker is not installed or not running. Please install Docker and start it.');
    }
    
    // First check if any container is already using the Qdrant port
    const portCheck = DockerManager.isPortUsedByContainer(port);
    if (portCheck.inUse) {
      this.logger.info(`✓ Qdrant container '${portCheck.containerName}' is already running on port ${port}`);
      // Verify it's actually Qdrant by checking the health endpoint
      try {
        await this.waitForQdrantReady(port, 5); // Quick check with only 5 attempts
        this.logger.info('✓ Confirmed Qdrant is responding on port', port);
        return;
      } catch {
        console.warn(`Container on port ${port} is not responding as Qdrant, will try to start our own`);
      }
    }
    
    // Check current status of our named container
    const status = DockerManager.getContainerStatus(containerName);
    
    if (status === 'running') {
      this.logger.info('✓ MMT Qdrant container is already running');
      return;
    }

    if (status === 'stopped') {
      this.logger.info('Starting existing MMT Qdrant container...');
      try {
        execSync(`docker start ${containerName}`, { stdio: 'inherit' });
        await this.waitForQdrantReady(port);
        console.log('✓ MMT Qdrant container started successfully');
        return;
      } catch (error) {
        console.error('Failed to start existing container, will create new one');
        // Remove the old container
        execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
      }
    }
    
    // Create and start new container
    console.log('Creating new MMT Qdrant container...');
    
    const dockerArgs = [
      'run',
      '-d', // Detached mode
      '--name', containerName,
      '-p', `${port}:6333`,
      '-p', `${grpcPort}:6334`,
      '-v', `${storagePath}:/qdrant/storage`,
      '--restart', 'unless-stopped',
      'qdrant/qdrant:latest'
    ];
    
    try {
      execSync(`docker ${dockerArgs.join(' ')}`, { stdio: 'inherit' });
      await this.waitForQdrantReady(port);
      console.log('✓ MMT Qdrant container created and started successfully');
    } catch (error) {
      throw new Error(`Failed to start Qdrant container: ${error}`);
    }
  }
  
  /**
   * Stop Qdrant container
   */
  async stopQdrant(): Promise<void> {
    const containerName = 'mmt-qdrant';
    
    if (!DockerManager.isContainerRunning(containerName)) {
      console.log('Qdrant container is not running');
      return;
    }
    
    console.log('Stopping Qdrant container...');
    try {
      execSync(`docker stop ${containerName}`, { stdio: 'inherit' });
      console.log('✓ Qdrant container stopped');
    } catch (error) {
      throw new Error(`Failed to stop Qdrant container: ${error}`);
    }
  }
  
  /**
   * Remove Qdrant container
   */
  async removeQdrant(): Promise<void> {
    const containerName = 'mmt-qdrant';
    const status = DockerManager.getContainerStatus(containerName);
    
    if (status === 'not_found') {
      return;
    }
    
    if (status === 'running') {
      await this.stopQdrant();
    }
    
    console.log('Removing Qdrant container...');
    try {
      execSync(`docker rm ${containerName}`, { stdio: 'inherit' });
      console.log('✓ Qdrant container removed');
    } catch (error) {
      throw new Error(`Failed to remove Qdrant container: ${error}`);
    }
  }
  
  /**
   * Wait for Qdrant to be ready
   */
  private async waitForQdrantReady(port: number, maxAttempts = 30): Promise<void> {
    console.log('Waiting for Qdrant to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to fetch Qdrant health endpoint
        const response = await fetch(`http://localhost:${port}/`);
        if (response.ok) {
          return;
        }
      } catch {
        // Not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Qdrant failed to start within 30 seconds');
  }
  
  /**
   * Get Qdrant health status
   */
  static async getQdrantHealth(port = 6333): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) {
        return { healthy: true };
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
   * Stop all Docker services
   */
  async stopAll(): Promise<void> {
    await this.stopQdrant();
  }
}