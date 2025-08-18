import { SimilarityProvider } from './interface';
import { ProviderInitOptions } from './types';

/**
 * Factory for creating and managing similarity providers
 */
export class SimilarityProviderFactory {
  private static providers = new Map<string, () => SimilarityProvider>();
  private static instances = new Map<string, SimilarityProvider>();
  
  /**
   * Register a provider factory function
   * @param name Provider name
   * @param factory Function that creates a new provider instance
   */
  static register(name: string, factory: () => SimilarityProvider): void {
    if (this.providers.has(name)) {
      console.warn(`Provider '${name}' is already registered. Overwriting.`);
    }
    this.providers.set(name, factory);
  }
  
  /**
   * Unregister a provider
   * @param name Provider name
   */
  static unregister(name: string): void {
    this.providers.delete(name);
    // Also cleanup any instances
    const instance = this.instances.get(name);
    if (instance) {
      instance.shutdown().catch(console.error);
      this.instances.delete(name);
    }
  }
  
  /**
   * Create a new provider instance
   * @param name Provider name
   * @param options Initialization options
   * @returns Initialized provider instance
   */
  static async create(
    name: string,
    options: ProviderInitOptions
  ): Promise<SimilarityProvider> {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(
        `Unknown similarity provider: '${name}'. ` +
        `Available providers: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }
    
    // Cleanup existing instance if any
    const existingInstance = this.instances.get(name);
    if (existingInstance) {
      await existingInstance.shutdown();
    }
    
    // Create and initialize new instance
    const provider = factory();
    await provider.initialize(options);
    
    // Cache the instance
    this.instances.set(name, provider);
    
    return provider;
  }
  
  /**
   * Get an existing provider instance
   * @param name Provider name
   * @returns Provider instance or undefined if not created
   */
  static getInstance(name: string): SimilarityProvider | undefined {
    return this.instances.get(name);
  }
  
  /**
   * Get list of registered provider names
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Check if a provider is registered
   * @param name Provider name
   */
  static hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
  
  /**
   * Shutdown all active provider instances
   */
  static async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values()).map(
      instance => instance.shutdown().catch(console.error)
    );
    await Promise.all(shutdownPromises);
    this.instances.clear();
  }
  
  /**
   * Clear all registrations and instances
   * Useful for testing
   */
  static clear(): void {
    this.shutdownAll().catch(console.error);
    this.providers.clear();
    this.instances.clear();
  }
}