import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '../src/config-service.js';

describe('ConfigService', () => {
  let tempDir: string;
  let configService: ConfigService;
  let processExitSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-config-test-'));
    configService = new ConfigService();
    
    // Mock process.exit to prevent test runner from exiting
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
    
    // Mock console.error to capture error messages
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
    
    // Restore mocks
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('successful loading', () => {
    it('should load valid config with absolute paths', () => {
      // Create vault directory
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      // Create config file
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
      
      // Load config
      const config = configService.load(configPath);
      
      // Verify
      expect(config.vaultPath).toBe(vaultPath);
      expect(config.indexPath).toBe(indexPath);
    });

    it('should load config when index path does not exist', () => {
      // Create vault directory
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      // Create config file with non-existent index path
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'non-existent', 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
      
      // Should succeed - index path will be created by indexer
      const config = configService.load(configPath);
      expect(config.indexPath).toBe(indexPath);
    });
  });

  describe('config path validation', () => {
    it('should exit when config path is empty', () => {
      expect(() => configService.load('')).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration path is required'));
    });

    it('should exit when config path is relative', () => {
      expect(() => configService.load('./config.yaml')).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Config path must be absolute'));
    });

    it('should exit when config file does not exist', () => {
      const configPath = join(tempDir, 'missing.yaml');
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Config file not found'));
    });
  });

  describe('YAML parsing', () => {
    it('should exit on invalid YAML', () => {
      const configPath = join(tempDir, 'invalid.yaml');
      writeFileSync(configPath, '{ invalid yaml content ]');
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid YAML'));
    });

    it('should exit on empty config file', () => {
      const configPath = join(tempDir, 'empty.yaml');
      writeFileSync(configPath, '');
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration validation failed'));
    });
  });

  describe('schema validation', () => {
    it('should exit when vaultPath is missing', () => {
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `indexPath: ${join(tempDir, 'index')}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('vaultPath: Required'));
    });

    it('should exit when indexPath is missing', () => {
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${join(tempDir, 'vault')}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('indexPath: Required'));
    });

    it('should exit when extra fields are present', () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${join(tempDir, 'index')}\nextraField: value`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unrecognized fields'));
    });
  });

  describe('path validation', () => {
    it('should exit when vaultPath is relative', () => {
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ./vault\nindexPath: ${join(tempDir, 'index')}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Vault path must be absolute'));
    });

    it('should exit when indexPath is relative', () => {
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ./index`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Index path must be absolute'));
    });

    it('should exit when vault directory does not exist', () => {
      const configPath = join(tempDir, 'config.yaml');
      const vaultPath = join(tempDir, 'non-existent-vault');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Vault directory not found'));
    });

    it('should exit when vault path is a file', () => {
      // Create a file instead of directory
      const vaultPath = join(tempDir, 'vault.txt');
      writeFileSync(vaultPath, 'not a directory');
      
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Vault path is not a directory'));
    });
  });

  describe('error message format', () => {
    it('should show example config on any error', () => {
      expect(() => configService.load('')).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Example config format:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('---');
      expect(consoleErrorSpy).toHaveBeenCalledWith('vaultPath: /absolute/path/to/vault');
      expect(consoleErrorSpy).toHaveBeenCalledWith('indexPath: /absolute/path/to/index');
      expect(consoleErrorSpy).toHaveBeenCalledWith('---\n');
    });
  });
});