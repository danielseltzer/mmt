import { describe, it, expect, beforeEach } from 'vitest';
import { HelpCommand } from '../../src/commands/help-command.js';
import type { AppContext } from '@mmt/entities';

describe('HelpCommand', () => {
  let command: HelpCommand;

  beforeEach(() => {
    command = new HelpCommand();
  });

  it('should have correct command name', () => {
    expect(HelpCommand.COMMAND_NAME).toBe('help');
  });

  it('should return success result', async () => {
    const context = {} as AppContext;
    
    const result = await command.execute(context, []);
    
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  // Note: We don't test console output without mocks.
  // The integration tests verify the actual output.
});