# Similarity Search Progress Indicator Implementation

## Summary
Implemented a progress indicator for similarity search UI that shows the indexing status as per issue #221.

## Files Created/Modified

### New Components Created:
1. **`/apps/web/src/components/SimilarityStatusIndicator.jsx`**
   - Main component that displays the similarity indexing status
   - Shows different states: ready, indexing, not_configured, error
   - Polls `/api/vaults/{vaultId}/similarity/status` every 5 seconds
   - Displays progress bar with percentage when indexing
   - Shows estimated time remaining when available

2. **`/apps/web/src/components/ui/progress.tsx`**
   - Radix UI-based progress bar component
   - Used to display indexing progress visually

### Modified Components:
1. **`/apps/web/src/components/SearchModeToggle.jsx`**
   - Integrated `SimilarityStatusIndicator` to show below the toggle buttons
   - Status appears only when similarity mode is active

2. **`/apps/web/src/components/QueryBar.jsx`**
   - Added `SimilarityIndexingWarning` component below search input
   - Shows warning when indexing is in progress: "⚠️ Index building in progress - results may be incomplete (X% indexed)"

## Visual States

### 1. Ready State (Green)
```
✓ Similarity search ready (5,992 documents indexed)
```

### 2. Indexing State (Blue with progress bar)
```
Building similarity index...
▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 70%
4,255/6,004 documents
Estimated time remaining: ~5 minutes
```

### 3. Not Configured State (Gray)
```
Similarity search not configured
```

### 4. Error State (Red)
```
Error: [error message]
```

## Features Implemented

1. **Status Polling**: Automatically polls the status endpoint every 5 seconds when in similarity mode
2. **Progress Bar**: Visual progress bar showing indexing completion percentage
3. **Document Count**: Shows indexed vs total documents (e.g., 4,255/6,004)
4. **Estimated Time**: Displays estimated time remaining when available from the API
5. **Search Warning**: Shows warning below search box when indexing is in progress
6. **Conditional Display**: Status indicator only appears when similarity mode is active
7. **Error Handling**: Gracefully handles API errors and not_configured states

## API Endpoint Used

- **Endpoint**: `/api/vaults/{vaultId}/similarity/status`
- **Response Format**:
```json
{
  "status": "indexing" | "ready" | "error" | "not_configured",
  "totalDocuments": number,
  "indexedDocuments": number,
  "percentComplete": number,
  "estimatedTimeRemaining": string | null
}
```

## Testing

### Test Files Created:
1. **`test-similarity-status.js`** - Node script to test the API endpoint
2. **`test-similarity-ui.html`** - HTML page to visually test the status display

### How to Test:
1. Start the application: `./bin/mmt start --config config/personal-vault-qdrant.yaml`
2. Open browser to http://localhost:5173
3. Click on "Similarity" search mode
4. Observe the status indicator showing the current indexing state
5. The status updates automatically every 5 seconds

## Dependencies Added
- `@radix-ui/react-progress` - For the progress bar component

## Notes
- The implementation follows the exact requirements from issue #221
- Status polling only occurs when similarity mode is active to minimize unnecessary API calls
- The UI gracefully handles all status states including errors and not_configured scenarios
- Search input remains enabled during indexing with a warning message displayed