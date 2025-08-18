import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimilarityProviderFactory } from '../factory';
import { MockSimilarityProvider } from '../mock-provider';
import { ProviderInitOptions } from '../types';

describe('SimilarityProviderFactory', () => {
  const mockOptions: ProviderInitOptions = {
    config: {
      provider: 'mock',
      ollamaUrl: 'http://localhost:11434',
      model: 'nomic-embed-text'
    },
    vaultPath: '/test/vault',
    vaultId: 'test-vault'
  };
  
  beforeEach(() => {
    SimilarityProviderFactory.clear();
  });
  
  afterEach(async () => {
    await SimilarityProviderFactory.shutdownAll();
    SimilarityProviderFactory.clear();
  });
  
  it('should register and create a provider', async () => {
    // Register mock provider
    SimilarityProviderFactory.register('mock', () => new MockSimilarityProvider());
    
    // Check registration
    expect(SimilarityProviderFactory.hasProvider('mock')).toBe(true);
    expect(SimilarityProviderFactory.getAvailableProviders()).toContain('mock');
    
    // Create instance
    const provider = await SimilarityProviderFactory.create('mock', mockOptions);
    expect(provider).toBeInstanceOf(MockSimilarityProvider);
    expect(provider.name).toBe('mock');
    expect(await provider.isHealthy()).toBe(true);
  });
  
  it('should throw error for unknown provider', async () => {
    await expect(
      SimilarityProviderFactory.create('unknown', mockOptions)
    ).rejects.toThrow('Unknown similarity provider: \'unknown\'');
  });
  
  it('should manage provider instances', async () => {
    SimilarityProviderFactory.register('mock', () => new MockSimilarityProvider());
    
    // Create instance
    const provider1 = await SimilarityProviderFactory.create('mock', mockOptions);
    
    // Get same instance
    const instance = SimilarityProviderFactory.getInstance('mock');
    expect(instance).toBe(provider1);
    
    // Create new instance (should replace old one)
    const provider2 = await SimilarityProviderFactory.create('mock', mockOptions);
    expect(provider2).not.toBe(provider1);
    
    // Old instance should be shutdown
    expect(await provider1.isHealthy()).toBe(false);
  });
  
  it('should unregister providers', () => {
    SimilarityProviderFactory.register('mock', () => new MockSimilarityProvider());
    expect(SimilarityProviderFactory.hasProvider('mock')).toBe(true);
    
    SimilarityProviderFactory.unregister('mock');
    expect(SimilarityProviderFactory.hasProvider('mock')).toBe(false);
  });
  
  it('should handle multiple providers', async () => {
    SimilarityProviderFactory.register('mock1', () => new MockSimilarityProvider());
    SimilarityProviderFactory.register('mock2', () => new MockSimilarityProvider());
    
    expect(SimilarityProviderFactory.getAvailableProviders()).toHaveLength(2);
    expect(SimilarityProviderFactory.getAvailableProviders()).toContain('mock1');
    expect(SimilarityProviderFactory.getAvailableProviders()).toContain('mock2');
    
    const provider1 = await SimilarityProviderFactory.create('mock1', mockOptions);
    const provider2 = await SimilarityProviderFactory.create('mock2', mockOptions);
    
    expect(provider1).not.toBe(provider2);
    expect(await provider1.isHealthy()).toBe(true);
    expect(await provider2.isHealthy()).toBe(true);
  });
  
  it('should shutdown all providers', async () => {
    SimilarityProviderFactory.register('mock1', () => new MockSimilarityProvider());
    SimilarityProviderFactory.register('mock2', () => new MockSimilarityProvider());
    
    const provider1 = await SimilarityProviderFactory.create('mock1', mockOptions);
    const provider2 = await SimilarityProviderFactory.create('mock2', mockOptions);
    
    expect(await provider1.isHealthy()).toBe(true);
    expect(await provider2.isHealthy()).toBe(true);
    
    await SimilarityProviderFactory.shutdownAll();
    
    expect(await provider1.isHealthy()).toBe(false);
    expect(await provider2.isHealthy()).toBe(false);
  });
});