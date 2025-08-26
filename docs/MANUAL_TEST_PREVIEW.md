# Manual Testing Guide for Preview Functionality

## Setup
1. Start MMT: `./bin/mmt start --config personal-vault-config.yaml`
2. Open browser to http://localhost:5173

## Test Cases

### 1. Basic Rename Operation
1. Click "Select" panel - leave filters empty (all documents)
2. Click "Transform" panel
3. Add a Rename operation with template: `{date}-{name}`
4. Click "Preview" button

**Expected:**
- Loading spinner appears briefly
- Preview modal shows:
  - Document count (e.g., "5968 documents selected")
  - Operation description: "Rename files using template: {date}-{name}"
  - 3 examples showing: `example.md → 2025-08-02-example`
  - No warnings

### 2. Destructive Delete Operation
1. Add filter to select specific folder
2. Add Delete operation with "permanent" option
3. Click Preview

**Expected:**
- Warning section appears with:
  - "This operation will permanently delete files and cannot be undone"
  - "X files will be deleted"
- Execute button is red (destructive variant)
- Modal shows high-risk warning

### 3. Multiple Operations
1. Add these operations in order:
   - Update Frontmatter: status = "archived"
   - Rename: "archived-{name}"
   - Move to: "/archive/2025"
2. Click Preview

**Expected:**
- All 3 operations listed with descriptions
- Examples for each operation
- Operations numbered 1, 2, 3

### 4. Validation Errors
1. Add Rename operation but leave template empty
2. Click Preview

**Expected:**
- Validation error section appears
- "Rename operation requires a template"
- Execute button is disabled

### 5. No Documents Selected
1. Add filters that match no documents
2. Add any operation
3. Click Preview

**Expected:**
- "0 documents selected"
- Info message: "No documents match the current filters"
- Execute button is disabled

### 6. Network Error Handling
1. Stop the API server (`./bin/mmt stop`)
2. Try to preview

**Expected:**
- Error modal appears
- Clear error message about connection failure

## API Testing with curl

Test the API directly:

```bash
# Preview rename operation
curl -X POST http://localhost:3001/api/pipelines/execute \
  -H "Content-Type: application/json" \
  -d '{
    "select": {"all": true},
    "operations": [{
      "type": "rename",
      "newName": "{date}-{name}.md"
    }],
    "options": {"destructive": false}
  }' | jq .

# Response should include:
# - preview: true
# - summary with operations array
# - examples showing transformations
# - validation status
```

## Verify Separation of Concerns

1. Check Network tab in browser DevTools
2. Confirm Preview button triggers API call to `/api/pipelines/execute`
3. Verify response contains full preview data
4. Confirm no preview logic runs client-side (check Sources tab)

## Performance Testing

1. Select large folder (1000+ documents)
2. Add complex operations
3. Click Preview

**Expected:**
- Preview loads within 1-2 seconds
- UI remains responsive
- Preview shows sample of transformations (not all 1000)