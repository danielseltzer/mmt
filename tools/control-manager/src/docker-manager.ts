/**
 * Docker Service Manager for MMT
 * Manages Docker containers required by MMT (currently Qdrant)
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    // Check current status
    const status = DockerManager.getContainerStatus(containerName);
    
    if (status === 'running') {
      console.log('✓ Qdrant container is already running');
      return;
    }
    
    if (status === 'stopped') {
      console.log('Starting existing Qdrant container...');
      try {
        execSync(`docker start ${containerName}`, { stdio: 'inherit' });
        await this.waitForQdrantReady(port);
        console.log('✓ Qdrant container started successfully');
        return;
      } catch (error) {
        console.error('Failed to start existing container, will create new one');
        // Remove the old container
        execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
      }
    }
    
    // Create and start new container
    console.log('Creating new Qdrant container...');
    
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
      console.log('✓ Qdrant container created and started successfully');
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