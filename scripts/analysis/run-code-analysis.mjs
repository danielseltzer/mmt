#!/usr/bin/env node

/**
 * @fileoverview Unified Code Analysis Script for MMT
 * 
 * This script runs dependency analysis tools and organizes their output
 * into a date-based folder structure for easier comparison over time.
 * 
 * Adapted from QM project for MMT's monorepo structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';
import { mkdir, copyFile } from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Get current date in YYYY-MM-DD format
const currentDate = new Date().toISOString().split('T')[0];

// Create date-based output directory
const outputDir = path.join(projectRoot, 'code-analysis', currentDate);
const dependencyGraphDir = path.join(outputDir, 'dependency-graph');

/**
 * Create all necessary directories
 */
async function createDirectories() {
  console.log('Creating output directories...');

  try {
    await mkdir(outputDir, { recursive: true });
    await mkdir(dependencyGraphDir, { recursive: true });

    console.log(`Created output directory: ${outputDir}`);
  } catch (error) {
    console.error('Error creating directories:', error);
    process.exit(1);
  }
}

/**
 * Run a command and log its output
 * @param {string} command - The command to run
 * @param {string} description - A description of the command
 * @param {boolean} [silent=false] - Whether to suppress console output
 * @returns {Promise<string|null>} - The command output or null if an error occurred
 */
async function runCommand(command, description, silent = false) {
  if (!silent) {
    console.log(`\n=== ${description} ===`);
    console.log(`Running: ${command}`);
  }

  try {
    const { stdout, stderr } = await execAsync(command, { 
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });

    if (stderr && !silent && !stderr.includes('warning')) {
      console.warn('Command produced warnings:', stderr);
    }

    return stdout;
  } catch (error) {
    if (!silent) {
      console.error(`Error running ${description}:`, error.message);
      if (error.stderr) {
        console.error(error.stderr);
      }
    }
    return null;
  }
}

/**
 * Check if required tools are installed
 */
async function checkRequiredTools() {
  console.log('Checking required tools...');
  
  // Check for dependency-cruiser
  const depCruiserCheck = await runCommand('which depcruise', 'Check dependency-cruiser', true);
  if (!depCruiserCheck) {
    console.error('dependency-cruiser is not installed. Please run: pnpm add -D -w dependency-cruiser');
    process.exit(1);
  }
  
  // Check for graphviz (dot command)
  const dotCheck = await runCommand('which dot', 'Check graphviz', true);
  if (!dotCheck) {
    console.error('Graphviz (dot) is not installed. Please install it:');
    console.error('  macOS: brew install graphviz');
    console.error('  Ubuntu/Debian: sudo apt-get install graphviz');
    console.error('  Windows: choco install graphviz');
    process.exit(1);
  }
  
  console.log('All required tools are installed.');
}

/**
 * Run Dependency Cruiser analysis
 */
async function runDependencyCruiser() {
  console.log('\n=== Running Dependency Cruiser Analysis ===');

  // Run dependency validation
  const validationResult = await runCommand('pnpm run dep:validate', 'Dependency Validation');
  
  if (validationResult) {
    const validationPath = path.join(dependencyGraphDir, 'validation-report.txt');
    fs.writeFileSync(validationPath, validationResult);
    console.log(`Validation report saved to: ${validationPath}`);
  }

  // Run detailed dependency graph
  await runCommand(
    `depcruise --config .dependency-cruiser.cjs --output-type dot . | dot -T svg > ${path.join(dependencyGraphDir, 'dependency-detailed.svg')}`,
    'Detailed Dependency Graph'
  );

  // Run architecture dependency graph
  await runCommand(
    `depcruise --config .dependency-cruiser.cjs --output-type archi . | dot -T svg > ${path.join(dependencyGraphDir, 'dependency-architecture.svg')}`,
    'Architecture Dependency Graph'
  );

  // Run folder dependency graph
  await runCommand(
    `depcruise --config .dependency-cruiser.cjs --output-type ddot . | dot -T svg > ${path.join(dependencyGraphDir, 'dependency-folder.svg')}`,
    'Folder Dependency Graph'
  );

  // Generate DOT and PDF files
  await runCommand(
    `depcruise --config .dependency-cruiser.cjs --output-type dot . > ${path.join(dependencyGraphDir, 'dependency-graph.dot')}`,
    'Dependency Graph DOT File'
  );

  await runCommand(
    `dot -Tpdf ${path.join(dependencyGraphDir, 'dependency-graph.dot')} -o ${path.join(dependencyGraphDir, 'dependency-graph.pdf')}`,
    'Dependency Graph PDF'
  );

  // Generate JSON output for further analysis
  await runCommand(
    `depcruise --config .dependency-cruiser.cjs --output-type json . > ${path.join(dependencyGraphDir, 'dependency-analysis.json')}`,
    'Dependency Analysis JSON'
  );

  console.log('Dependency Cruiser analysis completed.');
}

/**
 * Generate a summary report from the dependency analysis
 */
async function generateSummaryReport() {
  console.log('\n=== Generating Summary Report ===');
  
  const jsonPath = path.join(dependencyGraphDir, 'dependency-analysis.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.warn('No dependency analysis JSON found, skipping summary.');
    return;
  }
  
  try {
    const analysisData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const summary = {
      totalModules: analysisData.summary.totalCruised,
      violations: analysisData.summary.violations.length,
      errors: analysisData.summary.error,
      warnings: analysisData.summary.warn,
      info: analysisData.summary.info,
      rulesSummary: analysisData.summary.rulesSummary || []
    };
    
    let report = `# Dependency Analysis Summary - ${currentDate}\n\n`;
    report += `## Overview\n\n`;
    report += `- Total Modules Analyzed: ${summary.totalModules}\n`;
    report += `- Total Violations: ${summary.violations}\n`;
    report += `- Errors: ${summary.errors}\n`;
    report += `- Warnings: ${summary.warnings}\n`;
    report += `- Info: ${summary.info}\n\n`;
    
    if (summary.rulesSummary.length > 0) {
      report += `## Rules Summary\n\n`;
      report += `| Rule | Severity | Violations |\n`;
      report += `|------|----------|------------|\n`;
      
      for (const rule of summary.rulesSummary) {
        report += `| ${rule.name} | ${rule.severity} | ${rule.violations} |\n`;
      }
      report += '\n';
    }
    
    report += `## Visualizations\n\n`;
    report += `- [Architecture Overview](./dependency-graph/dependency-architecture.svg)\n`;
    report += `- [Detailed Dependencies](./dependency-graph/dependency-detailed.svg)\n`;
    report += `- [Folder Structure](./dependency-graph/dependency-folder.svg)\n`;
    report += `- [PDF Report](./dependency-graph/dependency-graph.pdf)\n`;
    
    const reportPath = path.join(outputDir, 'analysis-summary.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Summary report generated at: ${reportPath}`);
    
  } catch (error) {
    console.error('Error generating summary report:', error);
  }
}

/**
 * Compare with previous run
 */
async function compareWithPreviousRun() {
  console.log('\n=== Comparing with Previous Run ===');

  // Find the most recent previous run
  const codeAnalysisDir = path.join(projectRoot, 'code-analysis');
  const dirs = fs.readdirSync(codeAnalysisDir)
    .filter(dir => dir !== currentDate && /^\d{4}-\d{2}-\d{2}/.test(dir))
    .sort()
    .reverse();

  if (dirs.length === 0) {
    console.log('No previous runs found for comparison.');
    return;
  }

  const previousRunDir = dirs[0];
  console.log(`Comparing with previous run: ${previousRunDir}`);

  // Compare dependency analysis
  const currentAnalysisFile = path.join(dependencyGraphDir, 'dependency-analysis.json');
  const previousAnalysisFile = path.join(codeAnalysisDir, previousRunDir, 'dependency-graph', 'dependency-analysis.json');

  if (fs.existsSync(currentAnalysisFile) && fs.existsSync(previousAnalysisFile)) {
    const currentAnalysis = JSON.parse(fs.readFileSync(currentAnalysisFile, 'utf8'));
    const previousAnalysis = JSON.parse(fs.readFileSync(previousAnalysisFile, 'utf8'));

    console.log('\nDependency Analysis Comparison:');
    console.log(`Total Modules: ${previousAnalysis.summary.totalCruised} → ${currentAnalysis.summary.totalCruised} (${currentAnalysis.summary.totalCruised - previousAnalysis.summary.totalCruised > 0 ? '+' : ''}${currentAnalysis.summary.totalCruised - previousAnalysis.summary.totalCruised})`);
    console.log(`Violations: ${previousAnalysis.summary.violations} → ${currentAnalysis.summary.violations} (${currentAnalysis.summary.violations - previousAnalysis.summary.violations > 0 ? '+' : ''}${currentAnalysis.summary.violations - previousAnalysis.summary.violations})`);
    console.log(`Errors: ${previousAnalysis.summary.error} → ${currentAnalysis.summary.error} (${currentAnalysis.summary.error - previousAnalysis.summary.error > 0 ? '+' : ''}${currentAnalysis.summary.error - previousAnalysis.summary.error})`);
    console.log(`Warnings: ${previousAnalysis.summary.warn} → ${currentAnalysis.summary.warn} (${currentAnalysis.summary.warn - previousAnalysis.summary.warn > 0 ? '+' : ''}${currentAnalysis.summary.warn - previousAnalysis.summary.warn})`);
  } else {
    console.log('Previous analysis files not found for comparison.');
  }

  console.log('\nComparison completed.');
}

/**
 * Main function to run all analysis tools
 */
async function main() {
  console.log(`\n=== Starting Unified Code Analysis for MMT (${currentDate}) ===\n`);

  await checkRequiredTools();
  await createDirectories();
  await runDependencyCruiser();
  await generateSummaryReport();
  await compareWithPreviousRun();

  console.log(`\n=== Code Analysis Completed ===`);
  console.log(`Results saved to: ${outputDir}`);
  console.log(`Summary: ${path.join(outputDir, 'analysis-summary.md')}`);
}

// Run the main function
main().catch(error => {
  console.error('Error running code analysis:', error);
  process.exit(1);
});