# Handoff Summary - UI Foundation Work

## Current Mission: shadcn/ui Integration (Issue #111)

**Objective**: Replace basic CSS with professional component library to establish solid UI foundation before building filtering and operations features.

### Context
- Current web app uses basic CSS and is "hard to work with"
- Need modern, accessible component library before implementing core user workflows
- User wants to see basic working version ASAP, no need for gradual migration
- No backward compatibility needed - total replacement approach

## Project State

### Architecture
- **Framework**: React 19.1.0 + Vite 6.3.5
- **Current Styling**: Plain CSS in `apps/web/src/App.css`
- **State Management**: Zustand (`apps/web/src/stores/document-store`)
- **API**: REST server on port 3001, web app on port 5173
- **Table Component**: Uses TanStack Table + React Virtual in `@mmt/table-view`

### Current Web App Structure
```
apps/web/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # Basic CSS (to be replaced)
│   ├── components/
│   │   ├── QueryBar.jsx        # Search input
│   │   └── DocumentTable.jsx   # Table wrapper
│   ├── stores/
│   │   └── document-store.js   # Zustand state
│   └── main.jsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### How to Run
```bash
# Start development servers
pnpm dev
# OR individually:
pnpm run dev:api       # API server only
pnpm run dev:web       # Web server only
```

## Immediate Task: shadcn/ui Foundation

### Priority: P0 - Foundation Setup
**Goal**: Get basic shadcn/ui working with existing components replaced

#### Phase 1: Foundation (Priority 1)
1. **Install shadcn/ui dependencies**
   ```bash
   cd apps/web
   pnpm add -D tailwindcss postcss autoprefixer
   pnpm add @radix-ui/react-slot class-variance-authority lucide-react tailwind-merge tailwindcss-animate
   ```

2. **Configure Tailwind CSS**
   - Create `tailwind.config.js`
   - Create `postcss.config.js` 
   - Replace `App.css` with `globals.css` using Tailwind

3. **Setup shadcn/ui**
   - Run `pnx shadcn@latest init`
   - Configure `components.json`
   - Update `vite.config.ts` for path aliases
   - Update `tsconfig.json` for path resolution

#### Phase 2: Core Components (Priority 2)
1. **Install essential components**
   ```bash
   pnx shadcn@latest add button input table card badge separator dropdown-menu
   ```

2. **Replace existing components**
   - Convert `App.jsx` to use shadcn/ui layout (Card, Separator)
   - Replace `QueryBar.jsx` with shadcn/ui Input + Search icon
   - Replace `DocumentTable.jsx` with shadcn/ui Table components
   - Create `src/lib/utils.ts` with utility functions

3. **Test basic functionality**
   - Ensure document loading works
   - Verify search still functions
   - Confirm table displays data correctly

### Detailed Implementation Plan
See `SHADCN_IMPLEMENTATION_PLAN.md` for complete technical specifications.

## API Compatibility Requirements

**CRITICAL**: Do not modify APIs without approval. If UI needs different data format, ASK FIRST.

### Current API Contracts
- Document store: `useDocumentStore()` with `fetchDocuments()`, `setSearchQuery()`
- Document type from `@mmt/entities`
- TableView props from `@mmt/table-view`

### If API Mismatches Occur
1. Document the specific mismatch
2. Propose solution options
3. Request approval before making changes
4. Prefer UI adaptation over API changes

## Success Criteria for Phase 1-2

### Must Have
- [ ] App loads without errors
- [ ] Professional appearance (shadcn/ui styling)
- [ ] Search functionality works
- [ ] Document table displays data
- [ ] Consistent design system in place

### Demo Ready
- [ ] Clean, modern interface
- [ ] Responsive layout
- [ ] Accessible components
- [ ] TypeScript compilation without errors
- [ ] All existing functionality preserved

## Milestone 4 Context

**Ultimate Goal**: Core user workflow
1. Run app from command line
2. Select all files in vault
3. Add filters incrementally (text search, frontmatter, date)
4. Apply operations (move to folder, update frontmatter)

**Current Milestone 4 Issues**:
- #111 - UI Foundation (THIS TASK)
- #108 - CLI: Interactive document selection and filtering
- #109 - Query Parser: Support text search, date filters
- #110 - Web App: Add filter builder UI
- #18 - Reports Package (CSV export)
- #14 - View Persistence Package

## Next Session Tasks

### Immediate (Start Here)
1. **Setup shadcn/ui foundation** (Phase 1 from plan)
   - Install dependencies
   - Configure Tailwind CSS
   - Setup component system

2. **Replace core components** (Phase 2 from plan)
   - Convert App.jsx to modern layout
   - Replace QueryBar with shadcn/ui components
   - Replace DocumentTable with shadcn/ui Table

3. **Verify functionality**
   - Test document loading
   - Verify search works
   - Ensure table displays correctly

### After Basic UI Works
4. **Create GitHub issue update** for #111 with progress
5. **Identify next priority** from Milestone 4 issues
6. **Plan filter builder UI** implementation (#110)

## Important Notes

- **No gradual migration needed** - total replacement approach
- **Speed over perfection** - get basic version working first
- **Ask before API changes** - UI should adapt to existing APIs
- **Focus on foundation** - advanced features come after basic UI works
- **Use git workflow** - no special rollback planning needed

## Reference Documents
- `SHADCN_IMPLEMENTATION_PLAN.md` - Complete technical implementation guide
- `SCRIPTING_CHEATSHEET.md` - Advanced scripting features reference
- Issue #111 - UI Foundation GitHub issue
- Milestone 4 - Core User Experience milestone