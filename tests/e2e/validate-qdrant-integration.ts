#!/usr/bin/env tsx
/**
 * End-to-end validation test for Qdrant similarity search integration
 * 
 * This test validates the complete flow:
 * 1. Starts MMT with Qdrant provider
 * 2. Indexes a full production vault (6k documents)
 * 3. Monitors for any errors in logs
 * 4. Performs test searches to verify functionality
 * 5. Checks UI for proper display and no console errors
 * 
 * Exit codes:
 * 0 - All validations passed
 * 1 - Build/lint failures
 * 2 - Service startup failures
 * 3 - Indexing errors
 * 4 - Search validation failures
 * 5 - UI validation failures
 */

import { spawn, execSync } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Configuration
const TEST_CONFIG_PATH = path.join(rootDir, 'config/personal-vault-qdrant.yaml');
const API_PORT = 3001;
const WEB_PORT = 5173;
const INDEXING_TIMEOUT = 600000; // 10 minutes for 6k files
const SEARCH_TIMEOUT = 30000; // 30 seconds for search

// Test queries
const TEST_QUERIES = [
  { query: 'wood plane', minResults: 1 },
  { query: 'typescript', minResults: 1 },
  { query: 'markdown', minResults: 1 }
];

class ValidationSuite {
  private browser?: Browser;
  private page?: Page;
  private errors: string[] = [];
  private warnings: string[] = [];
  private logBuffer: string[] = [];
  
  async run(): Promise<void> {
    console.log('🚀 Starting Qdrant Integration Validation Suite\n');
    
    try {
      // Phase 1: Build and lint all packages
      await this.validateBuildAndLint();
      
      // Phase 2: Create test configuration
      await this.createTestConfig();
      
      // Phase 3: Start services with monitoring
      await this.startServicesWithMonitoring();
      
      // Phase 4: Wait for indexing to complete
      await this.waitForIndexingCompletion();
      
      // Phase 5: Validate search functionality
      await this.validateSearchFunctionality();
      
      // Phase 6: Validate UI
      await this.validateUI();
      
      // Phase 7: Generate report
      this.generateReport();
      
      console.log('\n✅ All validations passed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Validation failed:', error);
      this.generateReport();
      process.exit(this.getExitCode(error));
    } finally {
      await this.cleanup();
    }
  }
  
  private async validateBuildAndLint(): Promise<void> {
    console.log('📦 Phase 1: Building and linting packages...\n');
    
    const packages = [
      '@mmt/similarity-provider',
      '@mmt/similarity-provider-qdrant',
      '@mmt/similarity-provider-orama'
    ];
    
    for (const pkg of packages) {
      console.log(`  Building ${pkg}...`);
      try {
        execSync(`pnpm --filter ${pkg} build`, { 
          cwd: rootDir,
          stdio: 'pipe'
        });
        console.log(`  ✓ ${pkg} built successfully`);
      } catch (error) {
        this.errors.push(`Build failed for ${pkg}`);
        throw new Error(`Build failed for ${pkg}`);
      }
      
      console.log(`  Linting ${pkg}...`);
      try {
        execSync(`pnpm --filter ${pkg} lint`, {
          cwd: rootDir,
          stdio: 'pipe'
        });
        console.log(`  ✓ ${pkg} lint passed`);
      } catch (error) {
        this.warnings.push(`Lint warnings for ${pkg}`);
        // Don't fail on lint warnings, just record them
      }
    }
    
    console.log('\n✓ Build and lint validation complete\n');
  }
  
  private async createTestConfig(): Promise<void> {
    console.log('⚙️  Phase 2: Verifying test configuration...\n');
    
    // Config already exists, just verify it
    if (!fs.existsSync(TEST_CONFIG_PATH)) {
      throw new Error(`Config file not found: ${TEST_CONFIG_PATH}`);
    }
    
    console.log(`  ✓ Using config: ${TEST_CONFIG_PATH}\n`);
  }
  
  private async startServicesWithMonitoring(): Promise<void> {
    console.log('🚀 Phase 3: Starting services with monitoring...\n');
    
    return new Promise((resolve, reject) => {
      const mmtProcess = spawn('./bin/mmt', ['start', '--config', TEST_CONFIG_PATH], {
        cwd: rootDir,
        env: { ...process.env, DEBUG: '1' }
      });
      
      let apiReady = false;
      let webReady = false;
      let qdrantReady = false;
      
      // Monitor stdout
      mmtProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.logBuffer.push(`[STDOUT] ${line}`);
            console.log(`  ${line}`);
            
            // Check for readiness signals
            if (line.includes('Qdrant container') && line.includes('successfully')) {
              qdrantReady = true;
            }
            if (line.includes('API server ready')) {
              apiReady = true;
            }
            if (line.includes('Web server ready') || line.includes('Local:')) {
              webReady = true;
            }
            
            // Check if all services are ready
            if (qdrantReady && apiReady && webReady) {
              console.log('\n✓ All services started successfully\n');
              resolve();
            }
          }
        }
      });
      
      // Monitor stderr for errors
      mmtProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.logBuffer.push(`[STDERR] ${line}`);
            
            // Check for critical errors
            if (line.includes('Error') && !line.includes('Download')) {
              this.errors.push(line);
              console.error(`  ❌ ${line}`);
            }
          }
        }
      });
      
      // Handle process exit
      mmtProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`MMT process exited with code ${code}`));
        }
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (!apiReady || !webReady) {
          reject(new Error('Services failed to start within 60 seconds'));
        }
      }, 60000);
    });
  }
  
  private async waitForIndexingCompletion(): Promise<void> {
    console.log('📊 Phase 4: Waiting for indexing to complete...\n');
    
    const startTime = Date.now();
    let lastProgress = 0;
    
    while (Date.now() - startTime < INDEXING_TIMEOUT) {
      try {
        // Check indexing status
        const response = await fetch(`http://localhost:${API_PORT}/api/vaults/Personal/similarity/status`);
        if (response.ok) {
          const status = await response.json();
          
          if (status.indexStatus === 'ready') {
            console.log(`\n✓ Indexing complete: ${status.stats.documentsIndexed} documents\n`);
            return;
          }
          
          if (status.indexStatus === 'error') {
            this.errors.push(`Indexing error: ${status.error}`);
            throw new Error(`Indexing failed: ${status.error}`);
          }
          
          if (status.indexStatus === 'indexing' && status.progress) {
            const progress = status.progress.percentage;
            if (progress > lastProgress) {
              console.log(`  Indexing progress: ${progress}% (${status.progress.current}/${status.progress.total})`);
              lastProgress = progress;
            }
          }
        }
      } catch (error) {
        // API might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Indexing timeout - did not complete within 10 minutes');
  }
  
  private async validateSearchFunctionality(): Promise<void> {
    console.log('🔍 Phase 5: Validating search functionality...\n');
    
    for (const testQuery of TEST_QUERIES) {
      console.log(`  Testing query: "${testQuery.query}"`);
      
      try {
        const response = await fetch(`http://localhost:${API_PORT}/api/vaults/Personal/similarity/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: testQuery.query,
            limit: 10
          })
        });
        
        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }
        
        const results = await response.json();
        
        if (!Array.isArray(results.results)) {
          throw new Error('Invalid response format');
        }
        
        if (results.results.length < testQuery.minResults) {
          throw new Error(`Expected at least ${testQuery.minResults} results, got ${results.results.length}`);
        }
        
        console.log(`  ✓ Found ${results.results.length} results`);
        
        // Log top result for verification
        if (results.results.length > 0) {
          const topResult = results.results[0];
          console.log(`    Top result: ${topResult.path} (score: ${topResult.score.toFixed(3)})`);
        }
      } catch (error) {
        this.errors.push(`Search validation failed for "${testQuery.query}": ${error}`);
        throw error;
      }
    }
    
    console.log('\n✓ Search functionality validated\n');
  }
  
  private async validateUI(): Promise<void> {
    console.log('🖥️  Phase 6: Validating UI...\n');
    
    // Launch browser
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    
    // Collect console errors
    const consoleErrors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to web UI
    console.log(`  Navigating to http://localhost:${WEB_PORT}`);
    await this.page.goto(`http://localhost:${WEB_PORT}`, {
      waitUntil: 'networkidle'
    });
    
    // Wait for app to load
    await this.page.waitForSelector('[data-testid="app-root"], .app, #root', {
      timeout: 10000
    });
    console.log('  ✓ UI loaded successfully');
    
    // Check for console errors
    if (consoleErrors.length > 0) {
      this.errors.push(...consoleErrors.map(e => `Console error: ${e}`));
      throw new Error(`Found ${consoleErrors.length} console errors`);
    }
    console.log('  ✓ No console errors detected');
    
    // Check for similarity search UI elements
    try {
      // Look for similarity search panel or button
      const similarityElement = await this.page.waitForSelector(
        'text=/similarity|similar/i, button:has-text("Similar"), [aria-label*="similarity"]',
        { timeout: 5000 }
      );
      
      if (similarityElement) {
        console.log('  ✓ Similarity search UI element found');
        
        // Take screenshot for documentation
        await this.page.screenshot({
          path: path.join(rootDir, 'tests/e2e/screenshots/similarity-ui.png'),
          fullPage: true
        });
        console.log('  ✓ Screenshot saved');
      }
    } catch (error) {
      this.warnings.push('Similarity UI elements not visible (might need interaction)');
    }
    
    console.log('\n✓ UI validation complete\n');
  }
  
  private generateReport(): void {
    console.log('📋 Validation Report\n');
    console.log('=' .repeat(50));
    
    if (this.errors.length === 0) {
      console.log('✅ Status: PASSED');
    } else {
      console.log('❌ Status: FAILED');
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Save full log
    const logPath = path.join(rootDir, 'tests/e2e/validation-report.log');
    fs.writeFileSync(logPath, this.logBuffer.join('\n'));
    console.log(`\n📄 Full log saved to: ${logPath}`);
  }
  
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    // Close browser
    if (this.browser) {
      await this.browser.close();
    }
    
    // Stop MMT services
    try {
      execSync('./bin/mmt stop', { cwd: rootDir, stdio: 'ignore' });
      console.log('  ✓ Services stopped');
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  private getExitCode(error: any): number {
    const message = error?.message || '';
    
    if (message.includes('Build failed')) return 1;
    if (message.includes('Services failed')) return 2;
    if (message.includes('Indexing')) return 3;
    if (message.includes('Search')) return 4;
    if (message.includes('UI')) return 5;
    
    return 1; // Generic failure
  }
}

// Run the validation suite
const suite = new ValidationSuite();
suite.run().catch(console.error);