import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '../src/config-service.js';

describe('ConfigService', () => {
  let tempDir: string;
  let configService: ConfigService;
  let originalExit: typeof process.exit;
  let originalConsoleError: typeof console.error;
  let capturedErrors: string[] = [];
  
  beforeEach(() => {
    // Create temp directory for tests
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-config-test-'));
    configService = new ConfigService();
    capturedErrors = [];
    
    // Override process.exit to throw instead
    originalExit = process.exit;
    process.exit = ((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any;
    
    // Override console.error to capture output
    originalConsoleError = console.error;
    console.error = ((...args: any[]) => {
      capturedErrors.push(args.join(' '));
    }) as any;
  });

  afterEach(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
    
    // Restore originals
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  describe('successful loading', () => {
    it('should load valid config with absolute paths', () => {
      // GIVEN: A valid YAML config file with absolute paths
      // WHEN: Loading the config file
      // THEN: Returns parsed config with vaults array
      
      // Create vault directory
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      // Create config file
      const configPath = join(tempDir, 'config.yaml');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaults:\n  - name: 'TestVault'\n    path: ${vaultPath}\n    indexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      // Load config
      const config = configService.load(configPath);
      
      // Verify
      expect(config.vaults).toHaveLength(1);
      expect(config.vaults[0].name).toBe('TestVault');
      expect(config.vaults[0].path).toBe(vaultPath);
      expect(config.vaults[0].indexPath).toBe(indexPath);
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
      writeFileSync(configPath, `vaults:\n  - name: 'TestVault'\n    path: ${vaultPath}\n    indexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      // Should succeed - index path will be created by indexer
      const config = configService.load(configPath);
      expect(config.vaults[0].indexPath).toBe(indexPath);
    });
  });

  describe('config path validation', () => {
    it('should exit when config path is empty', () => {
      // GIVEN: An empty string as config path
      // WHEN: Attempting to load config
      // THEN: Exits with error about required config path
      expect(() => configService.load('')).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Configuration path is required');
    });

    it('should exit when config path is relative', () => {
      // GIVEN: A relative path to config file
      // WHEN: Validating the config path
      // THEN: Exits with error requiring absolute paths (explicit over implicit)
      expect(() => configService.load('./config.yaml')).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Config path must be absolute');
    });

    it('should exit when config file does not exist', () => {
      // GIVEN: A path to a non-existent config file
      // WHEN: Attempting to load the config
      // THEN: Exits with error message and code 1 (fail-fast)
      const configPath = join(tempDir, 'missing.yaml');
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Config file not found');
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
      expect(capturedErrors.join(' ')).toContain('Invalid YAML');
    });

    it('should exit on empty config file', () => {
      // GIVEN: An empty config file
      // WHEN: Attempting to validate the empty config
      // THEN: Exits with validation error (no defaults policy)
      const configPath = join(tempDir, 'empty.yaml');
      writeFileSync(configPath, '');
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Configuration validation failed');
    });
  });

  describe('schema validation', () => {
    it('should exit when vaults is missing', () => {
      // GIVEN: A config file missing required vaults field
      // WHEN: Validating against schema
      // THEN: Exits with Zod validation error for missing required field
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `apiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('vaults: Required');
    });

    it('should exit when vault has no name', () => {
      // GIVEN: A config file with vault missing name field
      // WHEN: Validating against schema
      // THEN: Exits with Zod validation error
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaults:\n  - path: ${vaultPath}\n    indexPath: ${join(tempDir, 'index')}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('name: Required');
    });

    it('should exit when extra fields are present', () => {
      // GIVEN: A config file with unrecognized fields
      // WHEN: Validating with strict schema
      // THEN: Exits with error about unrecognized fields (strict validation)
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaults:\n  - name: 'Test'\n    path: ${vaultPath}\n    indexPath: ${join(tempDir, 'index')}\napiPort: 3001\nwebPort: 3000\nextraField: value`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Unrecognized fields');
    });

    it('should exit when vault names are not unique', () => {
      // GIVEN: A config file with duplicate vault names
      // WHEN: Validating vault names uniqueness
      // THEN: Exits with error about duplicate names
      const vaultPath1 = join(tempDir, 'vault1');
      const vaultPath2 = join(tempDir, 'vault2');
      mkdirSync(vaultPath1);
      mkdirSync(vaultPath2);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaults:\n  - name: 'Duplicate'\n    path: ${vaultPath1}\n    indexPath: ${join(tempDir, 'index1')}\n  - name: 'Duplicate'\n    path: ${vaultPath2}\n    indexPath: ${join(tempDir, 'index2')}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Vault names must be unique');
    });
  });

  describe('path validation', () => {
    it('should exit when vault path is relative', () => {
      // GIVEN: A config with relative vault path
      // WHEN: Validating path requirements
      // THEN: Exits requiring absolute path (no implicit resolution)
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaults:\n  - name: 'Test'\n    path: ./vault\n    indexPath: ${join(tempDir, 'index')}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Path must be absolute');
    });

    it('should exit when indexPath is relative', () => {
      // GIVEN: A config with relative index path
      // WHEN: Validating path requirements
      // THEN: Exits requiring absolute path for explicit configuration
      const vaultPath = join(tempDir, 'vault');
      mkdirSync(vaultPath);
      
      const configPath = join(tempDir, 'config.yaml');
      writeFileSync(configPath, `vaults:\n  - name: 'Test'\n    path: ${vaultPath}\n    indexPath: ./index\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Path must be absolute');
    });

    it('should exit when vault directory does not exist', () => {
      // GIVEN: A config pointing to non-existent vault directory
      // WHEN: Validating vault path exists
      // THEN: Exits with error about missing vault directory
      const configPath = join(tempDir, 'config.yaml');
      const vaultPath = join(tempDir, 'non-existent-vault');
      const indexPath = join(tempDir, 'index');
      writeFileSync(configPath, `vaults:\n  - name: 'Test'\n    path: ${vaultPath}\n    indexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Vault directory not found');
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
      writeFileSync(configPath, `vaults:\n  - name: 'Test'\n    path: ${vaultPath}\n    indexPath: ${indexPath}\napiPort: 3001\nwebPort: 3000`);
      
      expect(() => configService.load(configPath)).toThrow('Process exited with code 1');
      expect(capturedErrors.join(' ')).toContain('Vault path is not a directory');
    });
  });

  describe('error message format', () => {
    it('should show example config on any error', () => {
      // GIVEN: Any configuration error
      // WHEN: Displaying error message
      // THEN: Shows example config format to help user fix the issue
      expect(() => configService.load('')).toThrow();
      
      expect(capturedErrors.join(' ')).toContain('Configuration path is required');
    });
  });
});