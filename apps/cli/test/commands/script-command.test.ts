import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptCommand } from '../../src/commands/script-command.js';
import type { AppContext } from '@mmt/entities';

describe('ScriptCommand', () => {
  let command: ScriptCommand;
  let consoleLogSpy: any;
  let context: AppContext;

  beforeEach(() => {
    command = new ScriptCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    context = {
      config: {
        vaultPath: '/test/vault',
        indexPath: '/test/index',
      }
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should have correct command name', () => {
    expect(ScriptCommand.COMMAND_NAME).toBe('script');
  });

  it('should execute with script path', async () => {
    await command.execute(context, ['./hello.js']);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Script Placeholder] Would execute: ./hello.js'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Script Placeholder] Vault path: /test/vault'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Script Placeholder] Index path: /test/index'
    );
  });

  it('should pass script arguments', async () => {
    await command.execute(context, ['./hello.js', '--foo', 'bar', 'baz']);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Script Placeholder] Script args: --foo bar baz'
    );
  });

  it('should require script path', async () => {
    await expect(command.execute(context, []))
      .rejects.toThrow('Script path required');
  });

  it('should handle empty script args', async () => {
    await command.execute(context, ['./script.js']);
    
    // Should not log script args line when empty
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[Script Placeholder] Script args:')
    );
  });
});