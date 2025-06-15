import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpCommand } from '../../src/commands/help-command.js';
import type { AppContext } from '@mmt/entities';

describe('HelpCommand', () => {
  let command: HelpCommand;
  let consoleLogSpy: any;

  beforeEach(() => {
    command = new HelpCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should have correct command name', () => {
    expect(HelpCommand.COMMAND_NAME).toBe('help');
  });

  it('should display help text', async () => {
    const context = {} as AppContext;
    
    await command.execute(context, []);
    
    expect(consoleLogSpy).toHaveBeenCalledWith('MMT - Markdown Management Toolkit');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Options:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
  });

  it('should list available commands', async () => {
    await command.execute({} as AppContext, []);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('script'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('help'));
  });

  it('should show example usage', async () => {
    await command.execute({} as AppContext, []);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('mmt --config=./vault.yaml script ./hello.js')
    );
  });
});