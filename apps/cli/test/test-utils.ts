import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the CLI in a subprocess and capture output.
 * This is the NO MOCKS way to test CLI applications.
 */
export async function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const cliPath = join(__dirname, '..', 'dist', 'index.js');
    
    // Run the built JavaScript directly with Node's ESM loader
    const proc = spawn('node', ['--no-warnings=ExperimentalWarning', cliPath, ...args], {
      cwd: join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
  });
}