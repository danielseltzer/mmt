# MMT Indexer Test Scripts

These scripts test the indexer integration and allow comparison with Obsidian Dataview queries.

## Setup

1. Update `test-vault-config.yaml` with your actual vault path:
   ```yaml
   vaultPath: /path/to/your/obsidian/vault
   ```

2. Run a test script:
   ```bash
   pnpm mmt script test-scripts/count-all.mmt.ts --config test-vault-config.yaml
   ```

## Test Scripts

### count-all.mmt.ts
Counts total markdown files in vault. Compare with Dataview:
```dataview
list length(file.name)
```

### count-by-type.mmt.ts  
Counts files by frontmatter `type` field. Compare with:
```dataview
TABLE length(rows) as Count
FROM ""
GROUP BY type
```

### list-by-tag.mmt.ts
Lists files with #project tag. Compare with:
```dataview
LIST
FROM #project
```

### find-in-path.mmt.ts
Finds files in specific folder. Compare with:
```dataview
LIST  
FROM "journal"
```

### query-combined.mmt.ts
Complex query with multiple conditions. Compare with:
```dataview
TABLE status, modified
FROM "projects"
WHERE status = "active"
```

## Expected Results

Run these scripts against your vault and compare the counts/results with equivalent Dataview queries to validate the indexer is working correctly.