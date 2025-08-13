# MMT Handoff Document

## Current Status (2025-08-13 - Latest Update)

### 🚀 V3 Implementation In Progress

**COMPLETED**: 
- ✅ Issue #156: Multi-vault configuration schema (PR #188 merged)
- ✅ Issue #186: Vault context architecture (PR #192 merged)
  - Created `@mmt/vault` package with VaultRegistry singleton
  - Documented in ADR-006: Vault as Container Architecture
- ✅ Issue #189: Vault-aware API routes (PR #193 merged)
  - All routes now use `/api/vaults/:vaultId/...` pattern
  - Fixed circular dependency (FileWatcher → filesystem-access)
  - Added vault validation middleware
- ✅ Issue #195: Add test coverage for vault package (PR #196 merged)
  - Comprehensive test coverage for vault package
  - Fixed all ESLint issues
  - Replaced process.exit with proper exception handling
- ✅ Issue #187: Missing web utility files (CLOSED - files existed)
- ✅ Issue #198: Test failures in indexer/CLI (CLOSED - already fixed)
- ✅ Issue #190: Vault initialization at startup (PR #199 merged)
  - Fixed duplicate vault initialization in API server
  - VaultRegistry is now single source of truth
  - Modified `/apps/api-server/src/context.ts`
- ✅ Issue #194: Remove backward compatibility code (PR #200 merged)
  - Removed all legacy routes and filter conversion
  - No more default vault fallbacks

**NEXT PRIORITY - Issue #191: Add Vault Selector Component to Web UI**
- 🎯 **Ready to implement** - All dependencies complete
- Web UI currently assumes single vault
- Need dropdown selector for multi-vault switching
- See user story below for context

**UPCOMING PRIORITIES**:
- 📋 Issue #160: Original vault selector planning (duplicate of #191)
- 📋 Issue #158: Per-tab state management
- 📋 Issue #157: Tab bar component

## 🎯 User Story for Vault Selector (Issue #191)

**As Sarah, a PhD researcher**, I manage three separate markdown collections:
- **Personal Research**: Dissertation notes, private thoughts (2,341 docs)
- **Lab Shared**: Collaborative notes with research lab (892 docs)
- **Teaching Materials**: Lecture notes and course materials (156 docs)

### The Experience with Vault Selector:
1. **Morning**: Open MMT, sees "Personal Research" (remembered from yesterday)
2. **Lab Work**: Click dropdown → Select "Lab Shared" → Document list refreshes
3. **Teaching**: Quick switch to "Teaching Materials" for student request
4. **Key Benefits**:
   - Isolated search per vault (no mixing contexts)
   - Mental model matches reality (separate collections)
   - Security (no accidental exposure during screen sharing)
   - Performance (only searches active vault)

### Implementation Requirements for #191

1. **Vault Selector Component** (`/apps/web/src/components/VaultSelector.tsx`)
   - Dropdown in top navigation bar
   - Shows vault name and status
   - Lists all vaults from `GET /api/vaults`

2. **State Management** (`/apps/web/src/stores/document-store.ts`)
   - Add `currentVaultId` and `vaults[]` to state
   - Clear documents on vault switch
   - Remember selection in localStorage

3. **API Updates** (`/apps/web/src/services/`)
   - Update all endpoints: `/api/documents` → `/api/vaults/${vaultId}/documents`
   - Handle vault status responses

4. **UI Behavior**:
   - Show loading spinner during switch
   - Display vault-specific document counts
   - Handle error states (disconnected vaults)

## 📝 Next Session Instructions

### Start on Branch
```bash
git checkout main
git pull origin main
git checkout -b feat/191-vault-selector
```

### Implementation Order
1. **Check API**: Verify `/api/vaults` endpoint exists and works
2. **Create Component**: Build VaultSelector.tsx with shadcn/ui Select
3. **Update Store**: Add vault state to document-store.ts
4. **Modify API Calls**: Update all endpoints to include vault ID
5. **Add Persistence**: LocalStorage for selected vault
6. **Test**: Single vault, multi-vault, error states

### Key Files to Modify
- `/apps/web/src/components/` - Add VaultSelector.tsx
- `/apps/web/src/stores/document-store.ts` - Add vault state
- `/apps/web/src/services/` - Update API endpoints
- `/apps/web/src/App.tsx` or navigation - Add selector to UI

## Testing Commands

```bash
# Start MMT services
./bin/mmt start --config dev-config.yaml

# Check status
./bin/mmt status

# Stop services
./bin/mmt stop

# Run full test suite
pnpm clean && pnpm install && pnpm build && pnpm lint && pnpm test

# Run web UI tests
pnpm --filter @mmt/web test

# Run specific package tests
pnpm --filter @mmt/vault test
```

## Important Notes for #191

### What TO Do
- ✅ Check if `/api/vaults` endpoint already exists
- ✅ Use shadcn/ui Select component if available
- ✅ Store selected vault in localStorage
- ✅ Clear document list when switching vaults
- ✅ Show loading states during transitions

### What NOT to Do
- ❌ Don't assume single vault - design for multi-vault from start
- ❌ Don't forget error handling for unavailable vaults
- ❌ Don't mix vault contexts in search/filter state

## Environment Details
- Working directory: `/Users/danielseltzer/code/mmt`
- Current branch: `main` (ready for new feature branch)
- Main branch up to date with all fixes

## Summary of Recent Work

1. **Completed Issue #190**: Fixed duplicate vault initialization
   - Problem: API server creating indexers twice
   - Solution: Use VaultRegistry as single source of truth
   - PR #199 created and merged
2. **Completed Issue #194**: Removed backward compatibility code
   - Removed legacy routes and filter conversion
   - PR #200 merged
3. **Next Priority**: Issue #191 - Vault selector component for web UI
   - All backend dependencies complete
   - User story documented above
   - Implementation plan ready

---

*Handoff updated 2025-08-13. Ready to implement vault selector UI.*