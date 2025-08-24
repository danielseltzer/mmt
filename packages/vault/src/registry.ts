import type { Config } from '@mmt/entities';
import { Vault } from './vault.js';
import { Loggers, type Logger } from '@mmt/logger';

/**
 * Singleton registry for managing multiple vault instances across the application.
 * 
 * WHY: Centralized vault management with predictable initialization patterns:
 * - Default vault initializes synchronously to ensure app bootstrap succeeds/fails fast
 * - Additional vaults initialize asynchronously to prevent blocking the main vault
 * - Singleton pattern ensures consistent vault access across all application components
 * 
 * DESIGN DECISION: Mixed sync/async initialization because:
 * - Default vault failure should throw an error (fail-fast principle)
 * - Additional vaults are optional and shouldn't block application startup
 * - UI can show loading states for async vault initialization
 * 
 * ERROR HANDLING: Throws errors instead of calling process.exit() to maintain
 * testability and allow the application layer to decide how to handle failures
 * 
 * ARCHITECTURE ROLE: Central coordinator between:
 * - Config system (provides vault configurations)
 * - Vault instances (manages their lifecycle)
 * - API routes (provides vault access by ID)
 * - Application (handles startup/shutdown)
 * 
 * CRITICAL: This is a singleton - only one instance exists per process.
 * The getInstance() method ensures global access to the same registry.
 */
export class VaultRegistry {
  private static instance: VaultRegistry;
  private vaults = new Map<string, Vault>();
  private initializationPromise?: Promise<void>;
  private logger: Logger;

  private constructor() {
    // Private constructor for singleton pattern
    this.logger = Loggers.vault();
  }

  static getInstance(): VaultRegistry {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!VaultRegistry.instance) {
      VaultRegistry.instance = new VaultRegistry();
    }
    return VaultRegistry.instance;
  }

  /**
   * Initializes all vaults from configuration.
   * 
   * INITIALIZATION STRATEGY:
   * 1. Default vault (first in config): Initialize synchronously and await completion
   *    - If it fails, throws an error (fail-fast principle)
   *    - This ensures the core vault is available before app continues
   * 2. Additional vaults: Initialize asynchronously in parallel
   *    - Failures are logged but don't throw
   *    - UI can show loading/error states for individual vaults
   * 
   * @param config Application configuration containing vault definitions
   * @returns Promise that resolves when initialization is complete
   * @throws Error if no vaults configured or if default vault fails to initialize
   */
  async initializeVaults(config: Config): Promise<void> {
    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitializeVaults(config);
    return this.initializationPromise;
  }

  private async doInitializeVaults(config: Config): Promise<void> {
    // Log for debugging purposes
    this.logger.info(`Initializing ${String(config.vaults.length)} vault(s)`);

    // Clear any existing vaults
    for (const vault of this.vaults.values()) {
      vault.shutdown();
    }
    this.vaults.clear();

    if (config.vaults.length === 0) {
      throw new Error('No vaults configured');
    }

    // Initialize default vault synchronously (blocking)
    const [defaultVaultConfig] = config.vaults;
    const defaultVault = new Vault(defaultVaultConfig.name, defaultVaultConfig);
    
    try {
      await defaultVault.initialize();
      this.vaults.set(defaultVault.id, defaultVault);
    } catch (error) {
      const message = `Failed to initialize default vault ${defaultVault.id}: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(message);
      throw new Error(message);
    }

    // Initialize additional vaults asynchronously in parallel
    if (config.vaults.length > 1) {
      const additionalVaults = config.vaults.slice(1);
      const initPromises = additionalVaults.map(async (vaultConfig) => {
        const vault = new Vault(vaultConfig.name, vaultConfig);
        try {
          await vault.initialize();
          this.vaults.set(vault.id, vault);
        } catch (error) {
          // Additional vaults fail gracefully
          this.logger.error(`Failed to initialize vault ${vault.id}`, { error });
          vault.status = 'error';
          vault.error = error instanceof Error ? error : new Error(String(error));
          this.vaults.set(vault.id, vault);
        }
      });

      // Wait for all additional vaults to complete initialization attempts
      await Promise.allSettled(initPromises);
    }

    // Log initialization summary
    const readyVaults = this.getAllVaults().filter(v => v.status === 'ready');
    const errorVaults = this.getAllVaults().filter(v => v.status === 'error');
    
    this.logger.info('Vault initialization complete:', {
      ready: readyVaults.length,
      failed: errorVaults.length
    });
    
    if (errorVaults.length > 0) {
      errorVaults.forEach(v => {
        this.logger.warn(`Failed vault: ${v.id}`, { 
          error: v.error?.message 
        });
      });
    }
  }

  /**
   * Gets a specific vault by ID.
   * 
   * @param id Vault identifier from configuration
   * @returns Vault instance
   * @throws Error if vault with given ID doesn't exist
   */
  getVault(id: string): Vault {
    const vault = this.vaults.get(id);
    if (!vault) {
      throw new Error(`Vault not found: ${id}`);
    }
    return vault;
  }

  /**
   * Gets the default vault (first vault in configuration).
   * 
   * WHY: Many operations need a default vault when no specific vault is specified.
   * The first vault is treated as default per our initialization strategy.
   * 
   * @returns Default vault or undefined if no vaults are initialized
   */
  getDefaultVault(): Vault | undefined {
    // Return first vault as default
    return Array.from(this.vaults.values())[0];
  }

  /**
   * Gets all registered vaults.
   * 
   * @returns Array of all vault instances (ready, initializing, or error state)
   */
  getAllVaults(): Vault[] {
    return Array.from(this.vaults.values());
  }

  /**
   * Gets all vault IDs.
   * 
   * @returns Array of vault identifiers
   */
  getVaultIds(): string[] {
    return Array.from(this.vaults.keys());
  }

  /**
   * Checks if a vault with the given ID exists.
   * 
   * @param id Vault identifier to check
   * @returns true if vault exists, false otherwise
   */
  hasVault(id: string): boolean {
    return this.vaults.has(id);
  }

  /**
   * Shuts down all vaults and cleans up the registry.
   * 
   * WHY: Ensures proper cleanup when application shuts down:
   * - Calls shutdown on all vault instances
   * - Clears the registry state
   * - Resets initialization state for potential restart
   * 
   * USAGE: Call during application shutdown or in test cleanup
   */
  shutdown(): void {
    this.logger.info('Shutting down all vaults');
    Array.from(this.vaults.values()).forEach(vault => {
      try {
        vault.shutdown();
      } catch (error: unknown) {
        this.logger.error(`Error shutting down vault ${vault.id}`, { error });
      }
    });
    this.vaults.clear();
    this.initializationPromise = undefined;
  }
}

// Export singleton instance
export const vaultRegistry = VaultRegistry.getInstance();