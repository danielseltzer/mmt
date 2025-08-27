/**
 * File Revealer Service
 * 
 * Provides an abstraction for revealing files in the system file manager.
 * Uses the Strategy pattern to allow different implementations for testing
 * and production, maintaining the NO MOCKS principle while avoiding
 * unwanted side effects during testing.
 */

import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname, basename } from 'path';

const execAsync = promisify(exec);

/**
 * Strategy interface for revealing files in the system file manager
 */
export interface FileRevealStrategy {
  /**
   * Reveal a file in the system file manager
   * @param filePath - Absolute path to the file to reveal
   * @throws Error if the file doesn't exist or operation fails
   */
  reveal(filePath: string): Promise<void>;
}

/**
 * Real implementation that actually opens the system file manager
 */
export class SystemFileRevealStrategy implements FileRevealStrategy {
  async reveal(filePath: string): Promise<void> {
    // First verify the file exists
    if (!existsSync(filePath)) {
      throw new Error(`Cannot reveal non-existent file: ${filePath}`);
    }

    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      // macOS - use 'open' command with -R flag to reveal in Finder
      command = `open -R "${filePath}"`;
    } else if (platform === 'win32') {
      // Windows - use explorer with /select flag
      const windowsPath = filePath.replace(/\//g, '\\');
      command = `explorer.exe /select,"${windowsPath}"`;
    } else {
      // Linux - try various file managers
      const parentDir = dirname(filePath);
      const fileName = basename(filePath);
      
      // Try different Linux file managers
      command = `xdg-open "${parentDir}" 2>/dev/null || ` +
                `nautilus --select "${filePath}" 2>/dev/null || ` +
                `dolphin --select "${filePath}" 2>/dev/null || ` +
                `thunar "${parentDir}" 2>/dev/null || ` +
                `pcmanfm "${parentDir}" 2>/dev/null`;
    }

    try {
      await execAsync(command);
    } catch (error) {
      // Some file managers return non-zero exit codes even on success
      // Log but don't throw for Linux file managers
      if (platform !== 'linux') {
        throw new Error(`Failed to reveal file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

/**
 * Test implementation that validates but doesn't actually open the file manager
 */
export class TestFileRevealStrategy implements FileRevealStrategy {
  private revealedFiles: string[] = [];

  async reveal(filePath: string): Promise<void> {
    // Verify file exists - this tests the real constraint
    if (!existsSync(filePath)) {
      throw new Error(`Cannot reveal non-existent file: ${filePath}`);
    }

    // Log the action for test verification
    this.revealedFiles.push(filePath);
    console.log(`[TEST MODE] Would reveal file: ${filePath}`);
  }

  /**
   * Get the list of files that would have been revealed
   * Useful for test assertions
   */
  getRevealedFiles(): string[] {
    return [...this.revealedFiles];
  }

  /**
   * Clear the list of revealed files
   * Useful for test cleanup
   */
  clearRevealedFiles(): void {
    this.revealedFiles = [];
  }
}

/**
 * Dry run implementation that logs actions without executing
 * Useful for debugging and CI environments
 */
export class DryRunFileRevealStrategy implements FileRevealStrategy {
  async reveal(filePath: string): Promise<void> {
    // Verify file exists
    if (!existsSync(filePath)) {
      throw new Error(`Cannot reveal non-existent file: ${filePath}`);
    }

    // Log what would happen
    const platform = process.platform;
    console.log(`[DRY RUN] Would reveal file on ${platform}: ${filePath}`);
  }
}

/**
 * Main FileRevealer service that uses the strategy pattern
 */
export class FileRevealer {
  constructor(private strategy: FileRevealStrategy) {}

  /**
   * Reveal a file in the system file manager
   * @param filePath - Absolute path to the file to reveal
   */
  async reveal(filePath: string): Promise<void> {
    return this.strategy.reveal(filePath);
  }

  /**
   * Get the current strategy (useful for testing)
   */
  getStrategy(): FileRevealStrategy {
    return this.strategy;
  }

  /**
   * Create a FileRevealer with the appropriate strategy based on environment
   */
  static createFromEnvironment(): FileRevealer {
    if (process.env.NODE_ENV === 'test' || process.env.FILE_REVEAL_TEST_MODE === 'true') {
      return new FileRevealer(new TestFileRevealStrategy());
    }
    
    if (process.env.FILE_REVEAL_DRY_RUN === 'true') {
      return new FileRevealer(new DryRunFileRevealStrategy());
    }

    return new FileRevealer(new SystemFileRevealStrategy());
  }
}