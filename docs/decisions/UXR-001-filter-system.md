# UXR-001: Document Filter System

**Status**: Accepted  
**Date**: 2025-07-13  
**Context**: Need an intuitive, powerful filter system that can be saved and reused in scripts

## Decision

Implement a comprehensive filter bar with the following controls:

### Filter Bar Layout (left to right)
1. **Search box** (existing - searches all fields)
2. **"Name" filter** - text in filename only
3. **"Content" filter** - text in body content only  
4. **"Folders" dropdown** - multi-select with incremental search
5. **"Tags" dropdown** - multi-select with incremental search
6. **"Date" filter** - relative (e.g., "-30d") and absolute (e.g., "<1/1/2025")
7. **"Size" filter** - human-readable (e.g., "<1k", ">10M")
8. **Document count + active filter summary**

### Interaction Patterns

#### Multi-Select Dropdowns (Folders/Tags)
- Click control to open dropdown
- Search box at top for incremental filtering
- Checkbox list of all available values
- "Select All" / "Deselect All" buttons
- "Apply" button to confirm selection
- Shows current selections when reopened

#### Active Filter Display
- Single selection: "500 loaded | Folders: /Projects"
- Multiple selections: "500 loaded | Folders: 3 folders | Tags: 2 tags"
- Hover shows tooltip with full list
- Active filter text becomes clickable to edit

#### Text Filters (Name/Content)
- Simple text input with debounced application
- Clear button when populated

#### Date Filter
- Smart parsing of relative dates: "-30d", "-1w", "-6m", "-1y"
- Comparison operators: "<", ">", "<=", ">="
- Absolute dates: "1/1/2025", "2025-01-01"
- Date ranges: "1/1/2025-1/31/2025"

#### Size Filter  
- Human-readable units: "k", "M", "G"
- Comparison operators: "<", ">", "<=", ">="
- Examples: "<1k", ">10M", "<=5.5M"

### Data Model

All filter state is captured in a Zod schema that can be:
1. Serialized to JSON/YAML for saving
2. Used directly in operations
3. Loaded from saved configurations
4. Validated for correctness

```typescript
const FilterCriteriaSchema = z.object({
  search: z.string().optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  folders: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  date: z.object({
    operator: z.enum(['<', '>', '<=', '>=']),
    value: z.string(), // Can be relative "-30d" or absolute "2025-01-01"
  }).optional(),
  size: z.object({
    operator: z.enum(['<', '>', '<=', '>=']),
    value: z.string(), // Human-readable like "1k", "10M"
  }).optional(),
});
```

## Consequences

### Positive
- Intuitive UI that matches user mental models
- Filters can be saved and reused in scripts
- Progressive disclosure (simple search → advanced filters)
- Type-safe filter definitions
- Clear visual feedback of active filters

### Negative
- More complex than simple search
- Requires parsing logic for date/size expressions
- Additional UI components to maintain

## Implementation Notes

1. Use shadcn's Command component for multi-select dropdowns
2. Parse human-readable expressions on the frontend
3. Convert to structured queries for the backend
4. Store filter state in Zustand for persistence across navigation
5. Export filter state as operation criteria for scripts