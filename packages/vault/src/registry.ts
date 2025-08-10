import type { Config } from '@mmt/entities';
import { Vault } from './vault.js';

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

  getVault(id: string): Vault {
    const vault = this.vaults.get(id);
    if (!vault) {
      throw new Error(`Vault not found: ${id}`);
    }
    return vault;
  }

  getDefaultVault(): Vault | undefined {
    // Return first vault as default
    return Array.from(this.vaults.values())[0];
  }

  getAllVaults(): Vault[] {
    return Array.from(this.vaults.values());
  }

  getVaultIds(): string[] {
    return Array.from(this.vaults.keys());
  }

  hasVault(id: string): boolean {
    return this.vaults.has(id);
  }

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