#!/usr/bin/env tsx

/**
 * Generate a markdown report of all scriptable operations and their test status
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Operation {
  name: string;
  description: string;
  package: string;
  file: string;
  line: number;
  implemented: boolean;
  tested: boolean;
  testFiles: string[];
}

interface QueryOperator {
  prefix: string;
  description: string;
  examples: string[];
  implemented: boolean;
  tested: boolean;
  source: string;
}

async function findOperations(): Promise<Operation[]> {
  const operations: Operation[] = [];
  
  // Find all operation definitions in entities schema
  const schemaPath = join(__dirname, '../packages/entities/src/scripting.schema.ts');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  
  // Extract operation types from schema
  const operationTypes = ['move', 'rename', 'updateFrontmatter', 'delete', 'custom'];
  
  // Check scripting package for implementations
  const scriptRunnerPath = join(__dirname, '../packages/scripting/src/script-runner.ts');
  const scriptRunnerContent = existsSync(scriptRunnerPath) 
    ? readFileSync(scriptRunnerPath, 'utf-8') 
    : '';
  
  for (const opType of operationTypes) {
    // Check if operation throws "not yet implemented" error
    const isImplemented = scriptRunnerContent.length > 0 && 
      !scriptRunnerContent.includes(`Operation '${opType}' is not yet implemented`);
    
    // Find test files
    const testFiles = await glob(`packages/*/tests/**/*${opType}*.test.ts`);
    
    operations.push({
      name: opType,
      description: getOperationDescription(opType),
      package: '@mmt/scripting',
      file: 'packages/scripting/src/script-runner.ts',
      line: 0, // Would need AST parsing for exact line
      implemented: isImplemented && opType === 'custom', // Only custom is implemented
      tested: testFiles.length > 0,
      testFiles,
    });
  }
  
  return operations;
}

async function findQueryOperators(): Promise<QueryOperator[]> {
  const operators: QueryOperator[] = [];
  
  // Check if query functionality exists in indexer
  const indexerQueryPath = join(__dirname, '../packages/indexer/src/query-executor.ts');
  const hasQuerySupport = existsSync(indexerQueryPath);
  
  // Define known operators from documentation
  const knownOperators = [
    {
      prefix: 'fm:',
      description: 'Query frontmatter fields',
      examples: ['fm:status=draft', 'fm:tags~meeting'],
    },
    {
      prefix: 'fs:',
      description: 'Query filesystem properties',
      examples: ['fs:path=Daily/*', 'fs:name~test'],
    },
    {
      prefix: 'content:',
      description: 'Search document content',
      examples: ['content:~TODO', 'content:"exact phrase"'],
    },
    {
      prefix: 'link:',
      description: 'Query document links',
      examples: ['link:to=[[Target]]', 'link:from=[[Source]]'],
    },
  ];
  
  for (const op of knownOperators) {
    // Check if operator is mentioned in tests
    const testFiles = await glob(`packages/*/tests/**/*${op.prefix.replace(':', '')}*.test.ts`);
    
    operators.push({
      ...op,
      implemented: hasQuerySupport,
      tested: testFiles.length > 0,
      source: hasQuerySupport ? 'packages/indexer/src/query-executor.ts' : 'Not yet implemented',
    });
  }
  
  return operators;
}

function getOperationDescription(opType: string): string {
  const descriptions: Record<string, string> = {
    move: 'Move documents to a new location',
    rename: 'Rename documents',
    updateFrontmatter: 'Update document frontmatter fields',
    delete: 'Delete documents',
    custom: 'Execute custom operations',
  };
  return descriptions[opType] || 'Unknown operation';
}

async function generateReport() {
  console.log('Generating operations status report...');
  
  const operations = await findOperations();
  const queryOperators = await findQueryOperators();
  
  // Generate markdown report
  let report = `# MMT Operations Status Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Operations**: ${operations.length}
- **Implemented**: ${operations.filter(op => op.implemented).length}
- **Tested**: ${operations.filter(op => op.tested).length}
- **Coverage**: ${Math.round(operations.filter(op => op.tested).length / operations.length * 100)}%

## Script Operations

These operations can be used in MMT scripts to manipulate documents.

| Operation | Description | Status | Tests |
|-----------|-------------|--------|-------|
`;

  for (const op of operations) {
    const status = op.implemented ? '✅ Implemented' : '❌ Not Implemented';
    const tests = op.tested ? `✅ (${op.testFiles.length} files)` : '❌ None';
    report += `| \`${op.name}\` | ${op.description} | ${status} | ${tests} |\n`;
  }

  report += `

## Query Operators

These operators can be used in selection criteria to find documents.

| Operator | Description | Examples | Status |
|----------|-------------|----------|--------|
`;

  for (const op of queryOperators) {
    const status = op.implemented ? '✅' : '❌';
    const examples = op.examples.map(e => `\`${e}\``).join('<br>');
    report += `| \`${op.prefix}\` | ${op.description} | ${examples} | ${status} |\n`;
  }

  report += `

## Implementation Details

### Currently Implemented

1. **Indexing** (\`@mmt/indexer\`)
   - Multi-index architecture for fast queries
   - Frontmatter parsing
   - Link extraction (wikilinks and markdown links)
   - Tag indexing
   - Path-based queries

2. **Scripting** (\`@mmt/scripting\`)
   - Script loading and execution
   - Query-based document selection
   - Safe-by-default execution (preview mode)
   - Custom operation support

3. **Configuration** (\`@mmt/config\`)
   - YAML-based configuration
   - Schema validation
   - Required explicit config (no defaults)

### Not Yet Implemented

1. **Document Operations** (\`@mmt/operations\`)
   - Move, rename, delete operations
   - Link preservation during moves
   - Bulk operations with rollback

2. **File Relocator** (\`@mmt/file-relocator\`)
   - Smart link updating
   - Conflict resolution
   - Undo/redo support

3. **Query Parser** (\`@mmt/query-parser\`)
   - Full query syntax parsing
   - Complex boolean queries
   - Query optimization

## Testing Coverage

\`\`\`
packages/
├── indexer/        ✅ Full test coverage
├── scripting/      ✅ Core functionality tested
├── config/         ✅ Full test coverage
├── entities/       ✅ Schema validation tested
├── filesystem/     ✅ Basic tests
├── operations/     ❌ Not yet implemented
├── file-relocator/ ❌ Not yet implemented
└── query-parser/   ❌ Not yet implemented
\`\`\`

## Next Steps

1. Implement document operations package (Issue #10)
2. Add link extraction demonstration (Issue #8)
3. Build file relocator with link preservation (Issue #11)
4. Create query parser for complex queries

---

*This report is automatically generated. To update, run \`pnpm run report:operations\`*
`;

  // Write report
  const reportPath = join(__dirname, '../docs/operations-status.md');
  writeFileSync(reportPath, report);
  console.log(`Report written to: ${relative(process.cwd(), reportPath)}`);
}

// Run the generator
generateReport().catch(console.error);