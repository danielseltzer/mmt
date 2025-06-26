# Scripting Package Lint Fix Strategy

## Overview
The scripting package has 216 lint issues (211 errors, 5 warnings). This document outlines a systematic approach to fix these issues.

## Error Categories and Counts

### Critical Issues (Fix First)
1. **Type Safety Issues** (~100 errors)
   - `@typescript-eslint/no-explicit-any` - 21 occurrences
   - `@typescript-eslint/no-unsafe-*` - ~70 occurrences (call, assignment, member-access, return, argument)
   - These are interconnected - fixing the `any` types will resolve most unsafe operations

2. **Template Literal Type Issues** (27 errors)
   - `@typescript-eslint/restrict-template-expressions` - Invalid types in template literals
   - Mostly `number` types that need explicit conversion with `.toString()`

### Medium Priority Issues
3. **Conditional Expression Issues** (22 errors)
   - `@typescript-eslint/strict-boolean-expressions` - 22 occurrences
   - Need explicit boolean checks instead of truthy/falsy

4. **Nullish Coalescing** (14 errors)
   - `@typescript-eslint/prefer-nullish-coalescing` - Replace `||` with `??`

5. **Async/Await Issues** (5 errors)
   - `@typescript-eslint/await-thenable` - 4 unnecessary awaits
   - `@typescript-eslint/require-await` - 1 async function without await

### Low Priority Issues
6. **Console Statements** (5 warnings)
   - Replace with proper logging or remove

7. **Other Issues**
   - Missing default cases in switch statements
   - Unused variables
   - Non-null assertions
   - Code style issues (destructuring, etc.)

## Fix Strategy

### Phase 1: Type Foundation (Priority: Critical)
Fix the root cause - `any` types. This will cascade and fix most unsafe operations.

1. **Identify External Dependencies**
   - Look for imports and determine proper types
   - Key areas: dataframe operations, file operations, CLI operations

2. **Create Type Definitions**
   - Define interfaces for data structures
   - Type function parameters and return values
   - Use generics where appropriate

3. **Files to Fix (in order)**
   - `analysis-runner.ts` - Core analysis operations
   - `script-runner.ts` - Main script execution
   - `analysis-pipeline.ts` - Pipeline operations
   - `result-formatter.ts` - Output formatting
   - `markdown-report-generator.ts` - Report generation

### Phase 2: Template Literals (Priority: High)
Convert numeric values to strings explicitly:
```typescript
// Before
`Count: ${count}`
// After
`Count: ${count.toString()}`
```

### Phase 3: Boolean Expressions (Priority: Medium)
Add explicit checks:
```typescript
// Before
if (value) { }
// After
if (value !== null && value !== undefined) { }
// Or for strings
if (value && value.length > 0) { }
```

### Phase 4: Nullish Coalescing (Priority: Medium)
Simple find/replace:
```typescript
// Before
const x = value || defaultValue
// After
const x = value ?? defaultValue
```

### Phase 5: Cleanup (Priority: Low)
- Remove console.log statements
- Add default cases to switches
- Fix unused variables
- Clean up async/await usage

## Implementation Order

1. **Start with analysis-runner.ts**
   - Has the most errors (49)
   - Core functionality
   - Fix types will propagate to other files

2. **Then script-runner.ts**
   - Second most errors
   - Main entry point

3. **Continue with remaining files by error count**

## Key Type Definitions Needed

Based on the code patterns and dependencies, we need:

1. **Arquero Types** (already available via `@jrwats/arquero-types`)
   ```typescript
   import type { ColumnTable } from '@jrwats/arquero-types/table/column-table';
   import type { Table as ArqueroTable } from '@jrwats/arquero-types/table/table';
   ```

2. **Replace Current Table Type**
   ```typescript
   // Current workaround:
   type Table = ReturnType<typeof aq.table>;
   
   // Replace with:
   import type { ColumnTable } from '@jrwats/arquero-types/table/column-table';
   type Table = ColumnTable;
   ```

3. **Fix Arquero Method Calls**
   - Remove all `as any` casts on table operations
   - Use proper arquero methods:
     - `groupby` → `groupby()` (correct method name)
     - `count` → `count()` (correct)
     - `dedupe` → `dedupe()` (correct)
     - `select` → `select()` (correct)
     - `filter` → `filter()` (correct)

4. **Script Operation Types**
   - Define proper discriminated union for operations
   - Type the transform functions properly

## Error Distribution by File

Based on lint analysis:
- **analysis-runner.ts**: ~50 errors (mostly any-related type issues)
- **markdown-report-generator.ts**: ~80 errors (table operations with any casts)
- **result-formatter.ts**: ~40 errors (template literals, any types)
- **script-runner.ts**: ~46 errors (various type and async issues)

## Step-by-Step Implementation

### Step 1: Fix Table Type Definition (analysis-runner.ts)
```typescript
// Replace line 13
import type { ColumnTable } from '@jrwats/arquero-types/table/column-table';
type Table = ColumnTable;
```

### Step 2: Define Operation Types
Create a proper discriminated union for ScriptOperation:
```typescript
interface GroupByOperation {
  action: 'groupBy';
  field: string;
}

interface CountOperation {
  action: 'count';
}

interface DistinctOperation {
  action: 'distinct';
  field: string;
}

interface TransformOperation {
  transform: (table: Table) => Table;
}

type AnalysisOperation = GroupByOperation | CountOperation | DistinctOperation | TransformOperation;
```

### Step 3: Fix Type Casts in executeAnalysisOperation
Remove all `as any` casts and use proper types:
```typescript
case 'groupBy':
  const groupByOp = operation as GroupByOperation;
  return table.groupby(groupByOp.field);

case 'count':
  return table.count();

case 'distinct':
  const distinctOp = operation as DistinctOperation;
  return table.dedupe(distinctOp.field);
```

### Step 4: Fix Template Literal Expressions
Add explicit string conversions:
```typescript
// Before: `Count: ${count}`
// After: `Count: ${count.toString()}`
```

### Step 5: Fix Boolean Expressions
Add explicit null/undefined checks:
```typescript
// Before: if (value)
// After: if (value !== null && value !== undefined)
```

### Step 6: Replace || with ??
```typescript
// Before: const x = value || defaultValue
// After: const x = value ?? defaultValue
```

### Step 7: Fix Common Arquero Patterns
In markdown-report-generator.ts, replace all casts:
```typescript
// Before:
const sample = (table as any).slice(0, 10);
const rows = (table as any).objects();
const nonNullCount = (table as any).filter(`d => d['${col}'] != null`).numRows();

// After (with proper ColumnTable type):
const sample = table.slice(0, 10);
const rows = table.objects();
const nonNullCount = table.filter(`d => d['${col}'] != null`).numRows();
```

### Step 8: Fix Console Statements
Replace with proper error handling:
```typescript
// Before:
console.log('runAnalysis called with', documents.length, 'documents');

// After:
// Remove or use proper logging if needed
// this.logger?.debug(`runAnalysis called with ${documents.length} documents`);
```

### Step 9: Add Missing Default Cases
```typescript
switch (operation.action) {
  case 'groupBy':
    // ...
    break;
  case 'count':
    // ...
    break;
  default:
    throw new Error(`Unknown operation: ${operation.action}`);
}
```

## Success Metrics
- 0 lint errors
- 0 lint warnings
- All `any` types replaced with proper types
- Type coverage > 95%
- No runtime type errors