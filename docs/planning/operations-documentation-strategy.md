# Operations Documentation with Test Status

## Goal

Generate a markdown report on every build that shows:
- All scripting operations defined in code
- Implementation status (stub/partial/complete)
- Test coverage status (missing/failing/passing)
- Examples and requirements

## Proposed Solution

### 1. Annotate Operations with Metadata

```typescript
// packages/entities/src/scripting.schema.ts

/**
 * Operation types that can be performed on documents
 * @public
 */
export const OperationTypeSchema = z.enum([
  'move',
  'rename', 
  'updateFrontmatter',
  'delete',
  'custom',
]).describe('Type of operation to perform');

// Add metadata registry
export const OperationMetadata = {
  move: {
    description: 'Move files to a different directory',
    status: 'not-implemented',
    requires: ['@mmt/file-relocator'],
    example: { type: 'move', destination: 'archive/2023' },
    tests: ['move.test.ts']
  },
  rename: {
    description: 'Rename files based on patterns',
    status: 'not-implemented',
    requires: ['@mmt/file-relocator'],
    example: { type: 'rename', template: '{{date}}-{{title}}' },
    tests: ['rename.test.ts']
  },
  // ... etc
} as const;
```

### 2. Create Test Status Scanner

```typescript
// scripts/generate-operations-report.ts
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

interface TestStatus {
  file: string;
  exists: boolean;
  passing: boolean;
  skipped: boolean;
  error?: string;
}

async function getTestStatus(testFile: string): Promise<TestStatus> {
  const testPath = `tests/operations/${testFile}`;
  
  if (!existsSync(testPath)) {
    return { file: testFile, exists: false, passing: false, skipped: false };
  }

  // Check for .skip or .todo in test file
  const content = readFileSync(testPath, 'utf-8');
  const skipped = content.includes('.skip') || content.includes('.todo');

  // Run specific test file
  try {
    execSync(`vitest run ${testPath} --reporter=json`, { 
      encoding: 'utf-8',
      stdio: 'pipe' 
    });
    return { file: testFile, exists: true, passing: true, skipped };
  } catch (error) {
    return { 
      file: testFile, 
      exists: true, 
      passing: false, 
      skipped,
      error: error.message 
    };
  }
}
```

### 3. Generate Combined Report

```typescript
// scripts/generate-operations-report.ts (continued)

async function generateReport() {
  const operations = Object.entries(OperationMetadata);
  const report: string[] = [
    '# Scripting Operations Status Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    ''
  ];

  // Collect stats
  let implemented = 0;
  let tested = 0;
  let passing = 0;

  // Generate table
  report.push('| Operation | Status | Tests | Example |');
  report.push('|-----------|--------|-------|---------|');

  for (const [name, meta] of operations) {
    const testStatuses = await Promise.all(
      meta.tests.map(getTestStatus)
    );

    const testBadge = getTestBadge(testStatuses);
    const statusBadge = getStatusBadge(meta.status);
    const example = `\`${JSON.stringify(meta.example)}\``;

    report.push(`| ${name} | ${statusBadge} | ${testBadge} | ${example} |`);

    if (meta.status !== 'not-implemented') implemented++;
    if (testStatuses.some(t => t.exists)) tested++;
    if (testStatuses.every(t => t.passing)) passing++;
  }

  // Add summary stats
  report.unshift(
    `- Total Operations: ${operations.length}`,
    `- Implemented: ${implemented} (${percent(implemented, operations.length)})`,
    `- With Tests: ${tested} (${percent(tested, operations.length)})`, 
    `- Tests Passing: ${passing} (${percent(passing, tested)})`,
    ''
  );

  // Add detailed sections
  report.push('', '## Detailed Status', '');
  
  for (const [name, meta] of operations) {
    report.push(`### \`${name}\``);
    report.push('');
    report.push(meta.description);
    report.push('');
    report.push(`**Status**: ${meta.status}`);
    report.push(`**Requires**: ${meta.requires.join(', ') || 'None'}`);
    
    // Add test details
    const testStatuses = await Promise.all(
      meta.tests.map(getTestStatus)
    );
    
    report.push('');
    report.push('**Tests**:');
    for (const test of testStatuses) {
      const icon = test.passing ? '✅' : test.exists ? '❌' : '⚠️';
      const status = test.passing ? 'Passing' : test.exists ? 'Failing' : 'Missing';
      report.push(`- ${icon} ${test.file}: ${status}`);
      if (test.error) {
        report.push(`  Error: ${test.error}`);
      }
    }
    report.push('');
  }

  writeFileSync('docs/api/operations-status.md', report.join('\n'));
}

function getTestBadge(statuses: TestStatus[]): string {
  if (statuses.every(t => t.passing)) return '✅ Passing';
  if (statuses.some(t => t.exists && !t.passing)) return '❌ Failing';
  if (statuses.some(t => t.skipped)) return '⏭️ Skipped';
  if (statuses.every(t => !t.exists)) return '⚠️ Missing';
  return '🔶 Partial';
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'implemented': return '✅ Implemented';
    case 'partial': return '🔶 Partial';
    case 'not-implemented': return '❌ Not Implemented';
    default: return status;
  }
}
```

### 4. Integrate with Build

```json
// packages/scripting/package.json
{
  "scripts": {
    "build": "tsc && tsx scripts/generate-operations-report.ts",
    "test": "vitest",
    "report": "tsx scripts/generate-operations-report.ts"
  }
}
```

### 5. Example Output

```markdown
# Scripting Operations Status Report

Generated: 2024-01-16T12:00:00Z

## Summary

- Total Operations: 5
- Implemented: 0 (0%)
- With Tests: 2 (40%)
- Tests Passing: 0 (0%)

| Operation | Status | Tests | Example |
|-----------|--------|-------|---------|
| move | ❌ Not Implemented | ⚠️ Missing | `{"type":"move","destination":"archive/2023"}` |
| rename | ❌ Not Implemented | ⚠️ Missing | `{"type":"rename","template":"{{date}}-{{title}}"}` |
| updateFrontmatter | ❌ Not Implemented | ❌ Failing | `{"type":"updateFrontmatter","updates":{"status":"archived"}}` |
| delete | ❌ Not Implemented | ⏭️ Skipped | `{"type":"delete"}` |
| custom | 🔶 Partial | ✅ Passing | `{"type":"custom","action":"count"}` |

## Detailed Status

### `move`

Move files to a different directory

**Status**: not-implemented
**Requires**: @mmt/file-relocator

**Tests**:
- ⚠️ move.test.ts: Missing

### `updateFrontmatter`

Update frontmatter fields

**Status**: not-implemented  
**Requires**: @mmt/document-operations

**Tests**:
- ❌ updateFrontmatter.test.ts: Failing
  Error: Operation 'updateFrontmatter' is not yet implemented
```

## Benefits

1. **Single source of truth** - Operations defined once with metadata
2. **Live test status** - See what's actually working vs just defined
3. **Progress tracking** - Watch implementation progress over time
4. **Automated updates** - Regenerated on every build
5. **Test-driven insight** - See which operations have tests before implementation

Would you like me to implement this system?