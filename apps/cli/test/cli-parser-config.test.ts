import { describe, it, expect } from 'vitest';
import { CliParser } from '../src/cli-parser.js';

describe('CliParser config flag handling', () => {
  let parser: CliParser;

  beforeEach(() => {
    parser = new CliParser();
  });

  it('should accept --config with equals sign', () => {
    const args = ['--config=config/vault.yaml', 'script', 'test.ts'];
    const result = parser.parse(args);
    
    expect(result.configPath).toBe('config/vault.yaml');
    expect(result.command).toBe('script');
    expect(result.commandArgs).toEqual(['test.ts']);
  });

  it('should accept --config with space separator', () => {
    const args = ['--config', 'config/vault.yaml', 'script', 'test.ts'];
    const result = parser.parse(args);
    
    expect(result.configPath).toBe('config/vault.yaml');
    expect(result.command).toBe('script');
    expect(result.commandArgs).toEqual(['test.ts']);
  });

  it('should NOT parse config flag after command (standard CLI behavior)', () => {
    // Config flags after command are passed as args to the command
    const args = ['script', 'test.ts', '--config', 'config/vault.yaml'];
    const result = parser.parse(args);
    
    expect(result.configPath).toBeUndefined();
    expect(result.command).toBe('script');
    expect(result.commandArgs).toEqual(['test.ts', '--config', 'config/vault.yaml']);
  });

  it('should NOT parse config flag with equals after command', () => {
    const args = ['script', 'test.ts', '--config=config/vault.yaml'];
    const result = parser.parse(args);
    
    expect(result.configPath).toBeUndefined();
    expect(result.command).toBe('script');
    expect(result.commandArgs).toEqual(['test.ts', '--config=config/vault.yaml']);
  });

  it('should error when config value is missing', () => {
    const args = ['--config', 'script', 'test.ts'];
    
    expect(() => parser.parse(args)).toThrow('--config flag requires a value');
  });

  it('should handle complex script arguments with config', () => {
    const args = ['--config', 'vault.yaml', 'script', 'test.ts', '--execute', '--output=json'];
    const result = parser.parse(args);
    
    expect(result.configPath).toBe('vault.yaml');
    expect(result.command).toBe('script');
    expect(result.commandArgs).toEqual(['test.ts', '--execute', '--output=json']);
  });
});