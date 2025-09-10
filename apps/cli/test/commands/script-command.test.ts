import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScriptCommand } from '../../src/commands/script-command.js';
import type { AppContext } from '@mmt/entities';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ScriptCommand', () => {
  let command: ScriptCommand;
  let context: AppContext;
  let tempDir: string;
  let testScriptPath: string;

  beforeEach(() => {
    command = new ScriptCommand();
    
    // Create temp directory and test files
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-cli-test-'));
    
    // Create a valid test script with proper module syntax
    testScriptPath = join(tempDir, 'test-script.mjs');
    
    // Create some test markdown files
    writeFileSync(join(tempDir, 'test1.md'), '# Test 1\n\nContent');
    writeFileSync(join(tempDir, 'test2.md'), '# Test 2\n\nMore content');
    
    writeFileSync(testScriptPath, `
export default {
  define(context) {
    return {
      select: { files: [] },
      operations: [{
        type: 'move',
        fromPath: '/test.md',
        toPath: '/moved.md'
      }]
    };
  }
};
`);
    
    context = {
      config: {
        vaults: [{
          name: 'default',
          path: tempDir,
          indexPath: join(tempDir, '.mmt-index')
        }]
      }
    };
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should have correct command name', () => {
    expect(ScriptCommand.COMMAND_NAME).toBe('script');
  });

  it('should execute with script path', async () => {
    const result = await command.execute(context, [testScriptPath]);
    
    // Should execute successfully
    if (!result.success) {
      console.log('Script failed with message:', result.message);
      if (result.error) {
        console.log('Error stack:', result.error.stack);
      }
    }
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should pass script arguments', async () => {
    const result = await command.execute(context, [testScriptPath, '--execute']);
    
    // Should execute successfully
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should require script path', async () => {
    const result = await command.execute(context, []);
    
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Script path required');
  });

  it('should handle empty script args', async () => {
    const result = await command.execute(context, [testScriptPath]);
    
    // Should run successfully in preview mode by default
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should handle invalid script path', async () => {
    const invalidPath = join(tempDir, 'nonexistent.mjs');
    
    const result = await command.execute(context, [invalidPath]);
    
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Failed to load script');
  });
});