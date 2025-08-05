import { describe, it, expect } from 'vitest';
import { SimilaritySearchService } from '../../src/services/similarity-search.js';
import { ConfigService } from '@mmt/config';
import path from 'path';
import fs from 'fs/promises';

describe('Full Vault Indexing', () => {
  it('should index entire vault and report errors without failing', async () => {
    // This test requires a config file path from environment
    const configPath = process.env.MMT_TEST_CONFIG;
    if (!configPath) {
      console.log('Skipping vault test - set MMT_TEST_CONFIG to run');
      return;
    }
    
    // Check if Ollama is available
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        console.log('Skipping vault test - Ollama not available');
        return;
      }
    } catch {
      console.log('Skipping vault test - Ollama not running');
      return;
    }
    
    console.log(`\nTesting with config: ${configPath}`);
    
    const configService = new ConfigService();
    const config = await configService.load(configPath);
    
    if (!config.similarity?.enabled) {
      console.log('Skipping vault test - similarity not enabled in config');
      return;
    }
    
    const service = new SimilaritySearchService(config);
    await service.initialize();
    
    const startTime = Date.now();
    
    // Set up progress tracking
    let lastProgressReport = 0;
    service.on('progress', (progress) => {
      if (progress.percentage >= lastProgressReport + 10) {
        lastProgressReport = Math.floor(progress.percentage / 10) * 10;
        console.log(`  Progress: ${progress.percentage.toFixed(0)}% (${progress.current}/${progress.total})`);
      }
    });
    
    // Index the vault
    await service.indexDirectory(config.vaultPath);
    
    const duration = Date.now() - startTime;
    const errors = service.getIndexingErrors();
    const status = await service.getStatus();
    
    // Report results
    console.log(`\nIndexing completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(`Successfully indexed: ${status.stats.documentsIndexed} documents`);
    console.log(`Index size: ${(status.stats.indexSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nError summary:');
      const errorTypes = new Map<string, number>();
      errors.forEach(({ error }) => {
        const type = error.split(':')[0];
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
      });
      
      errorTypes.forEach((count, type) => {
        console.log(`  ${type}: ${count} files`);
      });
      
      // Show first few error examples
      console.log('\nFirst 5 errors:');
      errors.slice(0, 5).forEach(({ path, error }) => {
        console.log(`  ${path.replace(config.vaultPath, '.')}: ${error}`);
      });
    }
    
    // Performance metrics
    const filesPerSecond = status.stats.documentsIndexed / (duration / 1000);
    console.log(`\nPerformance: ${filesPerSecond.toFixed(1)} files/second`);
    
    // Should have indexed at least some documents
    expect(status.stats.documentsIndexed).toBeGreaterThan(0);
    
    // All errors should be tracked
    expect(errors).toBeDefined();
    expect(Array.isArray(errors)).toBe(true);
    
    // Test that search works on the indexed vault
    console.log('\nTesting search functionality...');
    const searchTests = [
      'markdown frontmatter metadata',
      'javascript typescript programming',
      'test documentation'
    ];
    
    for (const query of searchTests) {
      const results = await service.search(query, { limit: 3 });
      console.log(`  Query "${query}": ${results.length} results`);
      if (results.length > 0) {
        console.log(`    Top result: ${results[0].path.replace(config.vaultPath, '.')} (score: ${results[0].score.toFixed(3)})`);
      }
    }
    
    await service.shutdown();
  }, 300000); // 5 minute timeout for large vaults
});