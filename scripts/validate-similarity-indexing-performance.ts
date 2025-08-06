#!/usr/bin/env node

/**
 * Tests similarity search indexing performance and functionality.
 * 
 * This script:
 * - Loads an existing similarity index and measures startup time
 * - Performs a full reindex of the vault to measure indexing speed
 * - Tests search performance
 * - Estimates time required for different vault sizes
 * 
 * Usage:
 *   tsx scripts/validate-similarity-indexing-performance.ts <config-file>
 * 
 * Example:
 *   tsx scripts/validate-similarity-indexing-performance.ts personal-vault-config.yaml
 * 
 * Note: Config must have similarity.enabled = true
 */

import { SimilaritySearchService } from '../apps/api-server/src/services/similarity-search.js';
import { ConfigService } from '@mmt/config';
import path from 'path';
import fs from 'fs/promises';

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: tsx test-similarity-indexing.ts <config-file>');
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
  
  // Test 1: Initialization (loading existing index)
  console.log('\n=== Test 1: Loading existing index ===');
  const initStart = Date.now();
  await service.initialize();
  const initTime = Date.now() - initStart;
  
  const initialStatus = await service.getStatus();
  console.log(`Initialization time: ${initTime}ms`);
  console.log(`Index status: ${initialStatus.indexStatus}`);
  console.log(`Documents in index: ${initialStatus.stats.documentsIndexed}`);
  console.log(`Index size on disk: ${(initialStatus.stats.indexSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Test 2: Full reindexing
  console.log('\n=== Test 2: Full vault reindexing ===');
  console.log(`Vault path: ${config.vaultPath}`);
  
  // Count markdown files first
  const { glob } = await import('glob');
  const files = await glob('**/*.md', { cwd: config.vaultPath });
  console.log(`Found ${files.length} markdown files`);
  
  // Set up progress monitoring
  let lastProgress = 0;
  const progressInterval = setInterval(async () => {
    const status = await service.getStatus();
    if (status.progress && status.progress.percentage > lastProgress + 5) {
      lastProgress = Math.floor(status.progress.percentage);
      console.log(`Progress: ${lastProgress}% (${status.progress.current}/${status.progress.total}) - ${status.progress.elapsedSeconds?.toFixed(1)}s`);
    }
  }, 1000);
  
  service.on('status-changed', (data) => {
    console.log(`Status changed: ${data.previousStatus} -> ${data.newStatus}`);
  });
  
  const indexStart = Date.now();
  try {
    await service.indexDirectory(config.vaultPath);
    const indexTime = Date.now() - indexStart;
    
    clearInterval(progressInterval);
    
    const finalStatus = await service.getStatus();
    console.log(`\nIndexing completed:`);
    console.log(`Total time: ${(indexTime / 1000).toFixed(2)}s`);
    console.log(`Documents indexed: ${finalStatus.stats.documentsIndexed}`);
    console.log(`Average time per document: ${(indexTime / files.length).toFixed(2)}ms`);
    console.log(`Index size: ${(finalStatus.stats.indexSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Test 3: Sample search
    console.log('\n=== Test 3: Sample search ===');
    const searchStart = Date.now();
    const results = await service.search('markdown parsing frontmatter', { limit: 5 });
    const searchTime = Date.now() - searchStart;
    
    console.log(`Search time: ${searchTime}ms`);
    console.log(`Found ${results.length} results`);
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.path} (score: ${result.score.toFixed(3)})`);
    });
    
    // Test 4: Restart and load time
    console.log('\n=== Test 4: Restart and reload index ===');
    await service.shutdown();
    
    const service2 = new SimilaritySearchService(config);
    const reloadStart = Date.now();
    await service2.initialize();
    const reloadTime = Date.now() - reloadStart;
    
    const reloadStatus = await service2.getStatus();
    console.log(`Reload time: ${reloadTime}ms`);
    console.log(`Documents after reload: ${reloadStatus.stats.documentsIndexed}`);
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Vault: ${config.vaultPath}`);
    console.log(`Files: ${files.length}`);
    console.log(`Initial load time: ${initTime}ms`);
    console.log(`Full index time: ${(indexTime / 1000).toFixed(2)}s (${(indexTime / files.length).toFixed(2)}ms per file)`);
    console.log(`Reload time: ${reloadTime}ms`);
    console.log(`Search time: ${searchTime}ms`);
    console.log(`Index size: ${(finalStatus.stats.indexSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (files.length > 0) {
      const estimatedTimeFor6k = (indexTime / files.length) * 6000;
      console.log(`\nEstimated time for 6000 files: ${(estimatedTimeFor6k / 1000 / 60).toFixed(2)} minutes`);
    }
    
  } catch (error) {
    clearInterval(progressInterval);
    console.error('Indexing failed:', error);
  } finally {
    await service.shutdown();
    process.exit(0);
  }
}

main().catch(console.error);