import { describe, it, expect } from 'vitest';
import { CliParser } from '../src/cli-parser.js';

describe('CliParser', () => {
  let parser: CliParser;

  beforeEach(() => {
    parser = new CliParser();
  });

  describe('special flags', () => {
    it('should parse --version flag', () => {
      const result = parser.parse(['--version']);
      expect(result.version).toBe(true);
      expect(result.debug).toBe(false);
    });

    it('should parse --debug flag', () => {
      const result = parser.parse(['--debug']);
      expect(result.debug).toBe(true);
      expect(result.version).toBe(false);
    });

    it('should parse --help flag', () => {
      const result = parser.parse(['--help']);
      expect(result.command).toBe('help');
    });

    it('should parse -h flag', () => {
      const result = parser.parse(['-h']);
      expect(result.command).toBe('help');
    });
  });

  describe('config flag', () => {
    it('should parse --config with equals', () => {
      const result = parser.parse(['--config=./vault.yaml']);
      expect(result.configPath).toBe('./vault.yaml');
    });

    it('should handle empty config path', () => {
      const result = parser.parse(['--config=']);
      expect(result.configPath).toBe('');
    });
  });

  describe('commands', () => {
    it('should parse script command', () => {
      const result = parser.parse(['script']);
      expect(result.command).toBe('script');
      expect(result.commandArgs).toEqual([]);
    });

    it('should parse help command', () => {
      const result = parser.parse(['help']);
      expect(result.command).toBe('help');
    });

    it('should capture command arguments', () => {
      const result = parser.parse(['script', './hello.js', '--foo', 'bar']);
      expect(result.command).toBe('script');
      expect(result.commandArgs).toEqual(['./hello.js', '--foo', 'bar']);
    });
  });

  describe('combined usage', () => {
    it('should parse all flags with command', () => {
      const result = parser.parse([
        '--debug',
        '--config=./vault.yaml',
        'script',
        './test.js'
      ]);
      
      expect(result.debug).toBe(true);
      expect(result.configPath).toBe('./vault.yaml');
      expect(result.command).toBe('script');
      expect(result.commandArgs).toEqual(['./test.js']);
    });

    it('should handle flags after command', () => {
      const result = parser.parse([
        'script',
        './test.js',
        '--verbose'
      ]);
      
      expect(result.command).toBe('script');
      expect(result.commandArgs).toEqual(['./test.js', '--verbose']);
    });
  });

  describe('edge cases', () => {
    it('should return defaults for empty args', () => {
      const result = parser.parse([]);
      expect(result.version).toBe(false);
      expect(result.debug).toBe(false);
      expect(result.configPath).toBeUndefined();
      expect(result.command).toBeUndefined();
      expect(result.commandArgs).toEqual([]);
    });

    it('should throw error for unknown flags', () => {
      expect(() => parser.parse(['--unknown', 'script'])).toThrow('Unknown flag: --unknown');
    });

    it('should parse unknown commands', () => {
      const result = parser.parse(['--config=./test.yaml', 'random']);
      expect(result.command).toBe('random');
      expect(result.configPath).toBe('./test.yaml');
    });
  });
});