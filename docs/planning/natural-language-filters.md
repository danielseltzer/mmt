# Natural Language Filter Implementation Plan

## Overview
Enhance the filter system to support natural language date/size expressions and add link count filtering.

## Phase 1: Natural Language Date Parsing

### Supported Patterns
- **Relative past**: "last 30 days", "past week", "yesterday", "last month", "past year"
- **Relative future**: "next week", "tomorrow", "next 30 days"
- **Since/After**: "since January", "since 2024", "after March 2024", "since last week"
- **Before/Until**: "before 2025", "until December", "before yesterday"
- **Specific periods**: "this week", "this month", "this year", "today"
- **Ranges**: "between Jan and March", "from 2024 to 2025"
- **Operator syntax**: "> 2024-01-01", "<= yesterday", ">= last week"
- **Relative time with operators**: "< 7 days", "> 30 days", "< 2 weeks", "> 1 year"
- **Shorthand time units**: "< 7d", "> 30d", "<= 2w", "> 3m", "< 1y" (d=days, w=weeks, m=months, y=years)

### Implementation
1. Create `date-parser.ts` in entities package
2. Use regex patterns to identify natural language phrases
3. Convert to standard date operators and values
4. Return `DateFilter` object compatible with existing schema

## Phase 2: Natural Language Size Parsing

### Supported Patterns
- **Comparisons**: "under 10k", "over 1 meg", "less than 5mb", "at least 100k"
- **Ranges**: "between 1k and 10k", "from 100k to 1mb"
- **Informal units**: "1 meg", "5 gigs", "100 kilobytes"

### Implementation
1. Create `size-parser.ts` in entities package
2. Handle various unit formats (k/kb/kilobytes, m/mb/megabytes, etc.)
3. Convert to bytes for consistent comparison
4. Return `SizeFilter` object

## Phase 3: Link Count Filtering

### Indexer Changes
1. During indexing, build reverse link index: `Map<targetPath, Set<sourcePath>>`
2. Add to document metadata:
   - `inboundLinkCount`: number
   - `outboundLinkCount`: number (already have links array)
   - `externalLinkCount`: number (URLs starting with http/https)

### Filter Support
- Add link count filters to FilterCriteriaSchema
- Support natural language: "no inbound links", "more than 5 links", "has external links"

## Phase 4: Integration

### API Changes
- Update filter parsing in documents route
- Add natural language parsing before applying filters

### UI Changes
- Update FilterBar placeholder text to show examples
- Add link count filter inputs
- Show parsing feedback (what the system understood)

## Testing Strategy
1. Unit tests for date/size parsers with extensive examples
2. Integration tests for filter application
3. UI tests for user input → filter application flow

## Benefits
- More intuitive than date pickers or operator dropdowns
- Future-proof for voice input
- Consistent with LLM interaction patterns
- Easier for users to express intent