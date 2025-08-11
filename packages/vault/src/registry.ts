import type { Config } from '@mmt/entities';
import { Vault } from './vault.js';

/**
 * Singleton registry for managing multiple vault instances across the application.
 * 
 * WHY: Centralized vault management with predictable initialization patterns:
 * - Default vault initializes synchronously to ensure app bootstrap succeeds/fails fast
 * - Additional vaults initialize asynchronously to prevent blocking the main vault
 * - Singleton pattern ensures consistent vault access across all application components
 * 
 * DESIGN DECISION: Mixed sync/async initialization because:
 * - Default vault failure should crash the app early (fail-fast principle)
 * - Additional vaults are optional and shouldn't block application startup
 * - UI can show loading states for async vault initialization
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
  private vaults: Map<string, Vault> = new Map();
  private initializationPromise?: Promise<void>;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): VaultRegistry {
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
   *    - If it fails, the application exits with process.exit(1)
   *    - This ensures the core vault is available before app continues
   * 2. Additional vaults: Initialize asynchronously in parallel
   *    - Failures are logged but don't crash the application
   *    - UI can show loading/error states for individual vaults
   * 
   * @param config Application configuration containing vault definitions
   * @returns Promise that resolves when initialization is complete
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
    console.log(`Initializing ${config.vaults.length} vault(s)`);

    // Clear any existing vaults
    for (const vault of this.vaults.values()) {
      await vault.shutdown();
    }
    this.vaults.clear();

    if (config.vaults.length === 0) {
      throw new Error('No vaults configured');
    }

    // Initialize default vault synchronously (blocking)
    const defaultVaultConfig = config.vaults[0];
    const defaultVault = new Vault(defaultVaultConfig.name, defaultVaultConfig);
    
    try {
      await defaultVault.initialize();
      this.vaults.set(defaultVault.id, defaultVault);
    } catch (error) {
      console.error('Failed to initialize default vault, exiting');
      process.exit(1);
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
          console.error(`Failed to initialize vault ${vault.id}:`, error);
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
    
    console.log(`Vault initialization complete:`);
    console.log(`  - Ready: ${readyVaults.length} vault(s)`);
    if (errorVaults.length > 0) {
      console.log(`  - Failed: ${errorVaults.length} vault(s)`);
      errorVaults.forEach(v => {
        console.log(`    - ${v.id}: ${v.error?.message}`);
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
  async shutdown(): Promise<void> {
    console.log('Shutting down all vaults');
    const shutdownPromises = Array.from(this.vaults.values()).map(
      vault => vault.shutdown().catch(error => {
        console.error(`Error shutting down vault ${vault.id}:`, error);
      })
    );
    await Promise.all(shutdownPromises);
    this.vaults.clear();
    this.initializationPromise = undefined;
  }
}

// Export singleton instance
export const vaultRegistry = VaultRegistry.getInstance();