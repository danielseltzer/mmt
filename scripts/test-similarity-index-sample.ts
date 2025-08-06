#!/usr/bin/env node

/**
 * Tests similarity indexing on a sample of files from your vault.
 * 
 * This script:
 * - Indexes a limited number of files (default 100) to quickly test functionality
 * - Reports any indexing errors with details
 * - Tests search performance
 * - Estimates time for full vault indexing
 * 
 * Usage:
 *   tsx scripts/test-similarity-index-sample.ts <config-file> [max-files]
 * 
 * Examples:
 *   tsx scripts/test-similarity-index-sample.ts personal-vault-config.yaml
 *   tsx scripts/test-similarity-index-sample.ts personal-vault-config.yaml 500
 * 
 * Note: Config must have similarity.enabled = true
 */

import { SimilaritySearchService } from '../apps/api-server/src/services/similarity-search.js';
import { ConfigService } from '@mmt/config';
import path from 'path';

async function main() {
  const configPath = process.argv[2];
  const maxFiles = parseInt(process.argv[3] || '100');
  
  if (!configPath) {
    console.error('Usage: tsx test-similarity-quick.ts <config-file> [max-files]');
    process.exit(1);
  }

  console.log('Loading configuration...');
  const configService = new ConfigService();
  const config = await configService.load(configPath);

  if (!config.similarity?.enabled) {
    console.error('Similarity search is not enabled in config');
    process.exit(1);
  }

  const service = new SimilaritySearchService(config);
  
  // Test 1: Check if index exists and load it
  console.log('\n=== Testing index load time ===');
  const loadStart = Date.now();
  await service.initialize();
  const loadTime = Date.now() - loadStart;
  
  const initialStatus = await service.getStatus();
  console.log(`Load time: ${loadTime}ms`);
  console.log(`Ollama status: ${initialStatus.ollamaHealthy ? 'healthy' : 'not available'}`);
  console.log(`Index status: ${initialStatus.indexStatus}`);
  console.log(`Documents in existing index: ${initialStatus.stats.documentsIndexed}`);
  console.log(`Index size: ${(initialStatus.stats.indexSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Test 2: Index a subset of files to measure speed
  console.log(`\n=== Testing indexing speed (first ${maxFiles} files) ===`);
  
  const { glob } = await import('glob');
  const allFiles = await glob('**/*.md', { cwd: config.vaultPath });
  const testFiles = allFiles.slice(0, maxFiles);
  
  console.log(`Total files in vault: ${allFiles.length}`);
  console.log(`Testing with: ${testFiles.length} files`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  const indexStart = Date.now();
  for (let i = 0; i < testFiles.length; i++) {
    const file = testFiles[i];
    const filePath = path.join(config.vaultPath, file);
    
    try {
      await service.indexFile(filePath);
      successCount++;
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - indexStart) / 1000;
        const rate = successCount / elapsed;
        console.log(`Progress: ${i + 1}/${testFiles.length} (${rate.toFixed(1)} files/sec)`);
      }
    } catch (error) {
      errorCount++;
      errors.push(`${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  const indexTime = Date.now() - indexStart;
  
  console.log(`\nIndexing results:`);
  console.log(`Success: ${successCount} files`);
  console.log(`Errors: ${errorCount} files`);
  console.log(`Total time: ${(indexTime / 1000).toFixed(2)}s`);
  console.log(`Average per file: ${(indexTime / successCount).toFixed(2)}ms`);
  console.log(`Rate: ${(successCount / (indexTime / 1000)).toFixed(1)} files/sec`);
  
  if (errors.length > 0) {
    console.log(`\nFirst few errors:`);
    errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
  }
  
  // Persist the index
  await service.persist();
  
  // Test 3: Search performance
  console.log('\n=== Testing search performance ===');
  const queries = [
    'markdown frontmatter parsing',
    'machine learning algorithms',
    'software development practices',
    'cooking recipe ingredients',
    'travel planning destinations'
  ];
  
  for (const query of queries) {
    const searchStart = Date.now();
    const results = await service.search(query, { limit: 5 });
    const searchTime = Date.now() - searchStart;
    console.log(`Query: "${query}" - ${searchTime}ms (${results.length} results)`);
  }
  
  // Calculate estimates
  console.log('\n=== Estimates for full vault ===');
  const filesPerSecond = successCount / (indexTime / 1000);
  const estimatedFullIndexTime = allFiles.length / filesPerSecond;
  console.log(`At ${filesPerSecond.toFixed(1)} files/sec:`);
  console.log(`Full vault (${allFiles.length} files): ${(estimatedFullIndexTime / 60).toFixed(1)} minutes`);
  console.log(`6000 files: ${(6000 / filesPerSecond / 60).toFixed(1)} minutes`);
  
  await service.shutdown();
}

main().catch(console.error);