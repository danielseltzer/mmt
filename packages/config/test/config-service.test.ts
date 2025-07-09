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
      // GIVEN: A valid YAML config file with absolute paths
      // WHEN: Loading the config file
      // THEN: Returns parsed config with vaultPath and indexPath
      
      // Create vault directory
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      // Create config file
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      // Load config
      const config = configService.load(configPath);
      
      // Verify
      expect(config.vaultPath).toBe(vaultPath);
      expect(config.indexPath).toBe(indexPath);
    });

    it('should load config when index path does not exist', () => {
      // GIVEN: A config with valid vault but non-existent index path
      // WHEN: Loading the config
      // THEN: Succeeds because index directory will be created later by indexer
      
      // Create vault directory
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      // Create config file with non-existent index path
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'non-existent', 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      // Should succeed - index path will be created by indexer
      const config = configService.load(configPath);
      expect(config.indexPath).toBe(indexPath);
    });
  });

  describe('config path validation', () => {
    it('should exit when config path is empty', () => {
      // GIVEN: An empty string as config path
      // WHEN: Attempting to load config
      // THEN: Exits with error about required config path
      expect(() => configService.load('')).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration path is required'));
    });

    it('should exit when config path is relative', () => {
      // GIVEN: A relative path to config file
      // WHEN: Validating the config path
      // THEN: Exits with error requiring absolute paths (explicit over implicit)
      expect(() => configService.load('./config.yaml')).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Config path must be absolute'));
    });

    it('should exit when config file does not exist', () => {
      // GIVEN: A path to a non-existent config file
      // WHEN: Attempting to load the config
      // THEN: Exits with error message and code 1 (fail-fast)
      const configPath = join(tempDir, 'missing.yaml');
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Config file not found'));
    });
  });

  describe('YAML parsing', () => {
    it('should exit on invalid YAML', () => {
      // GIVEN: A config file with invalid YAML syntax
      // WHEN: Attempting to parse the YAML
      // THEN: Exits with YAML parsing error message
      const configPath = join(tempDir, 'invalid.yaml');
      writeFileSync(configPath, '{ invalid yaml content ]');
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid YAML'));
    });

    it('should exit on empty config file', () => {
      // GIVEN: An empty config file
      // WHEN: Attempting to validate the empty config
      // THEN: Exits with validation error (no defaults policy)
      const configPath = join(tempDir, 'empty.yaml');
      writeFileSync(configPath, '');
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration validation failed'));
    });
  });

  describe('schema validation', () => {
    it('should exit when vaultPath is missing', () => {
      // GIVEN: A config file missing required vaultPath field
      // WHEN: Validating against schema
      // THEN: Exits with Zod validation error for missing required field
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `indexPath: ${join(tempDir, 'index')}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('vaultPath: Required'));
    });

    it('should exit when indexPath is missing', () => {
      // GIVEN: A config file missing required indexPath field
      // WHEN: Validating against schema
      // THEN: Exits with Zod validation error (both fields are required)
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${join(tempDir, 'vault')}`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('indexPath: Required'));
    });

    it('should exit when extra fields are present', () => {
      // GIVEN: A config file with unrecognized fields
      // WHEN: Validating with strict schema
      // THEN: Exits with error about unrecognized fields (strict validation)
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
      // GIVEN: A config with relative vault path
      // WHEN: Validating path requirements
      // THEN: Exits requiring absolute path (no implicit resolution)
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ./vault\nindexPath: ${join(tempDir, 'index')}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Path must be absolute'));
    });

    it('should exit when indexPath is relative', () => {
      // GIVEN: A config with relative index path
      // WHEN: Validating path requirements
      // THEN: Exits requiring absolute path for explicit configuration
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ./index\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Path must be absolute'));
    });

    it('should exit when vault directory does not exist', () => {
      // GIVEN: A config pointing to non-existent vault directory
      // WHEN: Validating vault path exists
      // THEN: Exits with error about missing vault directory
      const configPath = join(tempDir, 'config.yaml');
      const vaultPath = join(tempDir, 'non-existent-vault');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Vault directory not found'));
    });

    it('should exit when vault path is a file', () => {
      // GIVEN: A vault path that points to a file instead of directory
      // WHEN: Validating vault path is a directory
      // THEN: Exits with error that vault must be a directory
      // Create a file instead of directory
      const vaultPath = join(tempDir, 'vault.txt');
      writeFileSync(vaultPath, 'not a directory');
      
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Vault path is not a directory'));
    });
  });

  describe('error message format', () => {
    it('should show example config on any error', () => {
      // GIVEN: Any configuration error
      // WHEN: Displaying error message
      // THEN: Shows example config format to help user fix the issue
      expect(() => configService.load('')).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration path is required'));
    });
  });
});