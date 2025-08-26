import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Loggers } from '@mmt/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestApiServerOptions {
  port: number;
  vaultPath: string;
  indexPath: string;
}

/**
 * Starts the ACTUAL api-server application for integration testing.
 * No test doubles - runs the real production server with test configuration.
 */
export async function createTestApiServer(options: TestApiServerOptions): Promise<{
  process: ChildProcess;
  close: () => Promise<void>;
}> {
  // Create config file for the API server
  const configPath = join(options.vaultPath, '.mmt-config.yaml');
  const config = {
    vaultPath: options.vaultPath,
    indexPath: options.indexPath,
    apiPort: options.port,
    webPort: 3000, // Not used but required by schema
  };
  
  // Ensure directories exist
  mkdirSync(options.vaultPath, { recursive: true });
  mkdirSync(options.indexPath, { recursive: true });
  
  // Write config file
  writeFileSync(configPath, `vaultPath: ${options.vaultPath}
indexPath: ${options.indexPath}
apiPort: ${options.port}
webPort: 3000
`);

  // Start the actual API server
  const apiProcess = spawn('pnpm', [
    '--filter', '@mmt/api-server',
    'dev',
    '--',
    '--config', configPath
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: options.port.toString(),
    },
    cwd: join(__dirname, '..', '..', '..'), // Go to monorepo root
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      apiProcess.kill();
      reject(new Error('API server failed to start within 10 seconds'));
    }, 10000);

    const checkReady = (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      
      // Log output for debugging
      if (process.env.DEBUG_API_SERVER) {
        const logger = Loggers.default();
        logger.debug('[API Server]:', chunk.trim());
      }
      
      if (output.includes('MMT API Server running on')) {
        clearTimeout(timeout);
        // Give it a tiny bit more time to fully initialize
        setTimeout(resolve, 100);
      }
    };

    apiProcess.stdout?.on('data', checkReady);
    apiProcess.stderr?.on('data', checkReady);
    
    apiProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    apiProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`API server exited with code ${code}\n${output}`));
      }
    });
  });

  return {
    process: apiProcess,
    close: () => new Promise<void>((resolve) => {
      apiProcess.once('exit', () => resolve());
      apiProcess.kill('SIGTERM');
      // Force kill after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        if (!apiProcess.killed) {
          apiProcess.kill('SIGKILL');
        }
      }, 5000);
    }),
  };
}