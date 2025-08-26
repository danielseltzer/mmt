# MMT Script Examples

This directory contains example scripts demonstrating MMT's capabilities for analyzing and managing markdown vaults.

## Running Examples

All examples can be run using the MMT CLI:

```bash
# Basic syntax
pnpm mmt --config <your-config.yaml> script <script-path>

# Example
pnpm mmt --config config/my-vault.yaml script docs/examples/analysis/find-most-linked-documents.mmt.ts
```

## Analysis Scripts

Scripts that analyze your vault without making changes:

### 📊 Link Analysis

- **[find-most-linked-documents.mmt.ts](./analysis/find-most-linked-documents.mmt.ts)**  
  Find documents that are referenced most frequently by other documents.
  *Use case: Identify your most important reference materials*

- **[vault-link-statistics.mmt.ts](./analysis/vault-link-statistics.mmt.ts)**  
  Comprehensive statistics about your vault's link structure.
  *Use case: Assess overall vault connectivity and organization*

- **[find-orphaned-documents.mmt.ts](./analysis/find-orphaned-documents.mmt.ts)**  
  Find documents with no incoming or outgoing links.
  *Use case: Discover isolated notes that need connecting*

### 🏷️ Content Analysis

- **[document-type-analysis.mmt.ts](./analysis/document-type-analysis.mmt.ts)**  
  Analyze documents by their frontmatter 'type' field.
  *Use case: Understand vault composition and type connectivity*

- **[tag-analysis.mmt.ts](./analysis/tag-analysis.mmt.ts)**  
  Analyze tag usage patterns across your vault.
  *Use case: Improve tag consistency and organization*

## Query Scripts (Coming Soon)

Scripts demonstrating MMT's query capabilities:
- Search by frontmatter fields
- Complex filtering with multiple conditions
- Date-based queries
- Path pattern matching

## Operation Scripts (Coming Soon)

Scripts that perform bulk operations on documents:
- Move files based on criteria
- Update frontmatter in bulk
- Archive old documents
- Reorganize by type or date

## Creating Your Own Scripts

MMT scripts are TypeScript files that export a class implementing the `Script` interface:

```typescript
import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

export default class MyScript implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any; // Arquero for data manipulation
    
    return {
      select: {}, // Document selection criteria
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // Your analysis logic here
            return table;
          }
        }
      ],
      output: {
        format: 'table' // or 'json', 'csv', 'summary'
      }
    };
  }
}
```

### Available Data

Each document in the table has these fields:
- `path`: Absolute file path
- `name`: Filename without extension
- `modified`: Last modified date
- `size`: File size in bytes
- `tags_count`, `tags`: Tag information
- `links_count`, `links`: Outgoing links
- `backlinks_count`, `backlinks`: Incoming links
- `fm_*`: Frontmatter fields (e.g., `fm_type`, `fm_status`)

### Arquero Operations

Common Arquero operations for data analysis:
- `filter()`: Select rows matching criteria
- `select()`: Choose columns to display
- `orderby()`: Sort results
- `groupby()` + `rollup()`: Aggregate data
- `derive()`: Add calculated columns
- `slice()`: Limit results

See [Arquero documentation](https://uwdata.github.io/arquero/) for more operations.