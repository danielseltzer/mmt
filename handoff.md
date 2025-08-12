# MMT Handoff Document

## Current Status (2025-08-11 - Latest Update)

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
  - Implemented comprehensive test suite with NO MOCKS
  - Achieved 100% test coverage
  - Fixed process.exit() anti-pattern (throw exceptions instead)
  - All 45 tests passing

**IN PROGRESS - Issue #194: Remove backward compatibility code**
- 🔧 **CURRENT WORK** - Removing unnecessary legacy code
- Identified backward compatibility locations:
  - Legacy routes in `/apps/api-server/src/app.ts` (lines 47-51)
  - Legacy filter conversion in `/apps/api-server/src/routes/documents.ts`
  - Default vault fallbacks using `context.config.vaults[0]`
- Branch: `fix/194-remove-backward-compatibility`
- **NEXT STEPS**:
  1. Remove legacy routes from app.ts
  2. Remove convertLegacyFilters function
  3. Ensure all routes require explicit vault ID
  4. Update any `context.config.vaults[0]` fallbacks
  5. Update CLAUDE.md to emphasize no backward compatibility

**UPCOMING PRIORITIES**:
- 📋 Issue #190: Initialize vaults at application startup (unblocked, next after #194)
- 📋 Issue #191: Add vault selector to web UI

## 🎯 Critical Context for Issue #194

### NO BACKWARD COMPATIBILITY Policy
The project has **ZERO TOLERANCE** for backward compatibility:
- ❌ Never maintain old API versions
- ❌ Never add aliases or legacy support
- ❌ Never keep deprecated code paths
- ✅ Direct breaking changes are fine (only one user)
- ✅ Keep codebase clean and simple

See CLAUDE.md for this critical policy.

### Backward Compatibility Code to Remove
1. **Legacy routes** in `/apps/api-server/src/app.ts`:
   - Lines 47-51: Routes that use first vault as default
   - These duplicate the vault-aware routes

2. **Legacy filter conversion** in `/apps/api-server/src/routes/documents.ts`:
   - `convertLegacyFilters` function (lines 152-230)
   - Legacy filter handling in GET /documents route

3. **Default vault fallbacks**:
   - Uses of `context.config.vaults[0]` as fallback
   - Found in documents.ts and similarity.ts

## 📝 Next Session Instructions

### Continue on Branch
```bash
# Already on: fix/194-remove-backward-compatibility
git status
```

### Implementation Steps
1. **Remove legacy routes** from `/apps/api-server/src/app.ts`:
   ```typescript
   // DELETE lines 47-51 (legacy routes)
   ```

2. **Remove legacy filter conversion** from documents router:
   - Delete `convertLegacyFilters` function
   - Update route handler to only accept new format

3. **Remove default vault fallbacks**:
   - Search for `context.config.vaults[0]`
   - Ensure all routes require explicit vault ID

4. **Update CLAUDE.md** to reinforce no backward compatibility

5. **Test and verify**:
   ```bash
   pnpm build
   pnpm test
   pnpm lint
   ```

### Key Files to Modify
- `/apps/api-server/src/app.ts` - Remove legacy routes
- `/apps/api-server/src/routes/documents.ts` - Remove legacy filter code
- `/apps/api-server/src/routes/similarity.ts` - Remove default vault
- `/CLAUDE.md` - Emphasize no backward compatibility

## Key Decisions from Previous Sessions

1. **Vault architecture is sound** - No refactoring needed
2. **Issue #195 completed** - 100% test coverage with NO MOCKS
3. **Process.exit() removed** - Library code now throws exceptions
4. **Issue #194 started** - Removing all backward compatibility code

## Testing Commands

```bash
# Run vault package tests
pnpm --filter @mmt/vault test

# Run with coverage
pnpm --filter @mmt/vault test:coverage

# Run specific test file
pnpm --filter @mmt/vault test vault.test.ts

# Run all tests across monorepo
pnpm test
```

## Important Notes

### What NOT to Do
- ❌ Don't rename Vault or VaultProvider classes
- ❌ Don't use any mocks, stubs, or test doubles
- ❌ Don't skip test coverage - #190 is blocked until this is done
- ❌ Don't create in-memory file system abstractions

### What TO Do
- ✅ Use real markdown files in OS temp directories
- ✅ Follow the test plan exactly as documented
- ✅ Add clear JSDoc comments to improve understanding
- ✅ Test multi-vault scenarios thoroughly
- ✅ Ensure proper resource cleanup in all tests

## GitHub Context

### Current Branch
- Branch: `fix/194-remove-backward-compatibility`
- Status: In progress, removing legacy code

### Issue #194 Details
**Title**: Remove backward compatibility code  
**Priority**: Medium  
**Milestone**: 2.5 (Clean Up & Tech Debt)  
**Labels**: `tech-debt`

### Success Criteria for PR
1. All legacy routes removed from app.ts
2. Legacy filter conversion function deleted
3. No default vault fallbacks remaining
4. All routes require explicit vault ID
5. Tests pass with no backward compatibility
6. CLAUDE.md updated to emphasize policy

---

*This handoff documents the completion of Issue #195 (vault test coverage) and the current progress on Issue #194 (removing backward compatibility). The next session should continue removing the identified legacy code.*