import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApplicationDirector } from '../src/application-director.js';

describe('ApplicationDirector', () => {
  let director: ApplicationDirector;
  let tempDir: string;
  let processExitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    director = new ApplicationDirector();
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-cli-test-'));
    
    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
    
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    processExitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('version flag', () => {
    it('should show version and exit', async () => {
      await expect(director.run(['--version']))
        .rejects.toThrow('Process exited with code 0');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^mmt version \d+\.\d+\.\d+$/)
      );
    });
  });

  describe('help command', () => {
    it('should show help for explicit help command', async () => {
      await director.run(['help']);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('MMT - Markdown Management Toolkit');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });

    it('should show help for --help flag', async () => {
      await director.run(['--help']);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('MMT - Markdown Management Toolkit');
    });

    it('should show help when no command given', async () => {
      await director.run([]);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('MMT - Markdown Management Toolkit');
    });

    it('should not require config for help', async () => {
      // Should not throw or ask for config
      await director.run(['help']);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('--config')
      );
    });
  });

  describe('config requirement', () => {
    it('should require config for script command', async () => {
      await expect(director.run(['script', './test.js']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('--config flag is required')
      );
    });

    it('should load valid config', async () => {
      // Create valid config
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
      
      // Run script command (placeholder)
      await director.run(['--config=' + configPath, 'script', './test.js']);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Script Placeholder]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(vaultPath)
      );
    });
  });

  describe('unknown command', () => {
    it('should exit with error for unknown command', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}`);
      
      await expect(director.run(['--config=' + configPath, 'unknown']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: unknown')
      );
    });
  });

  describe('debug mode', () => {
    it('should enable debug output', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      await director.run(['--debug', 'help']);
      
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug mode enabled');
      
      debugSpy.mockRestore();
    });
  });

  describe('script command', () => {
    it('should execute script command with args', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}`);
      
      await director.run([
        '--config=' + configPath,
        'script',
        './hello.js',
        '--foo',
        'bar'
      ]);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Script Placeholder] Would execute: ./hello.js')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Script Placeholder] Script args: --foo bar')
      );
    });

    it('should require script path', async () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}`);
      
      // The error is caught and process.exit is called
      await expect(director.run(['--config=' + configPath, 'script']))
        .rejects.toThrow('Process exited with code 1');
      
      // Check that the error message was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.objectContaining({
          message: expect.stringContaining('Script path required')
        })
      );
    });
  });
});