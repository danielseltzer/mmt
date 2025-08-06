#!/usr/bin/env node

/**
 * Validates that Ollama is properly installed and configured for similarity search.
 * 
 * This script checks:
 * - Ollama service is running
 * - Required embedding model (nomic-embed-text) is installed
 * - Embedding generation works correctly
 * - Performance is acceptable
 * 
 * Usage:
 *   tsx scripts/validate-ollama-setup.ts
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

async function checkOllama(): Promise<boolean> {
  process.stdout.write('Checking Ollama health...\n\n');
  
  let allHealthy = true;
  
  // 1. Check if Ollama is running
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json() as { models?: { name: string; size: number }[] };
    process.stdout.write('✓ Ollama is running\n');
    process.stdout.write(`  Found ${data.models?.length || 0} models\n`);
    
    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        process.stdout.write(`    - ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(2)}GB)\n`);
      });
    }
  } catch (error) {
    console.error('✗ Ollama is not accessible');
    console.error('  Make sure Ollama is running: ollama serve');
    console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
  
  // 2. Check if embedding model is available
  try {
    const response = await fetch('http://localhost:11434/api/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'nomic-embed-text' })
    });
    
    if (response.ok) {
      process.stdout.write('\n✓ nomic-embed-text model is available\n');
      const data = await response.json() as any;
      if (data.details?.parameter_size) {
        process.stdout.write(`  Parameter size: ${data.details.parameter_size}\n`);
      }
    } else {
      console.error('\n✗ nomic-embed-text model not found');
      console.error('  Install it with: ollama pull nomic-embed-text');
      allHealthy = false;
    }
  } catch (error) {
    console.error('\n✗ Failed to check model');
    console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    allHealthy = false;
  }
  
  // 3. Test embedding generation
  process.stdout.write('\nTesting embedding generation...\n');
  try {
    const testTexts = [
      'Test embedding generation',
      '', // Empty string
      '   \n\t   ', // Whitespace only
      'A longer test with multiple sentences. This helps verify that the embedding service can handle various input sizes.'
    ];
    
    for (const text of testTexts) {
      const displayText = text || '(empty string)';
      process.stdout.write(`  Testing "${displayText.substring(0, 30)}${displayText.length > 30 ? '...' : ''}"... `);
      
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      });
      
      if (!response.ok) {
        process.stdout.write(`✗ HTTP ${response.status}\n`);
        allHealthy = false;
        continue;
      }
      
      const data = await response.json() as { embedding?: number[] };
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        process.stdout.write('✗ Invalid response format\n');
        allHealthy = false;
      } else if (data.embedding.length === 0) {
        process.stdout.write(`✗ Empty embedding (${data.embedding.length} dimensions)\n`);
        allHealthy = false;
      } else if (data.embedding.length !== 768) {
        process.stdout.write(`⚠️  Unexpected dimensions: ${data.embedding.length} (expected 768)\n`);
        allHealthy = false;
      } else {
        process.stdout.write(`✓ ${data.embedding.length} dimensions\n`);
      }
    }
  } catch (error) {
    console.error('\n✗ Embedding generation failed:', error);
    allHealthy = false;
  }
  
  // 4. Performance test
  process.stdout.write('\nTesting embedding performance...\n');
  try {
    const start = Date.now();
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: `Performance test iteration ${i}: This is a test document with some content to generate embeddings.`
        })
      });
    }
    
    const elapsed = Date.now() - start;
    const avgTime = elapsed / iterations;
    process.stdout.write(`✓ Average embedding time: ${avgTime.toFixed(0)}ms per document\n`);
    process.stdout.write(`  Estimated for 6000 docs: ${((avgTime * 6000) / 1000 / 60).toFixed(1)} minutes\n`);
  } catch (error) {
    console.error('✗ Performance test failed:', error);
    allHealthy = false;
  }
  
  // Summary
  process.stdout.write('\n' + '='.repeat(50) + '\n');
  if (allHealthy) {
    process.stdout.write('✅ Ollama is healthy and ready for similarity search!\n');
  } else {
    process.stdout.write('❌ Ollama health check failed. Please fix the issues above.\n');
  }
  
  return allHealthy;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkOllama().then(healthy => {
    process.exit(healthy ? 0 : 1);
  });
}

export { checkOllama };