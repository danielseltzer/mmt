# Common Build Issues

## TypeScript Compiling in Source Directories

### Problem
Finding `.js`, `.d.ts`, or `.d.ts.map` files in `src/` directories instead of `dist/`.

### Cause
This happens when `tsc` is run without proper configuration, typically:
- Running `tsc` directly from the command line without specifying a tsconfig
- Running `tsc` from the wrong directory
- A misconfigured build script

### Prevention
1. **Always use pnpm scripts**: Run `pnpm build` instead of `tsc` directly
2. **Check detection**: The root `pnpm build` has a prebuild check that will fail if these files exist
3. **Clean regularly**: Run `pnpm clean` to remove all build artifacts

### Fix
If you encounter this issue:
```bash
# Clean all build artifacts including those in src directories
pnpm clean

# Rebuild properly
pnpm build
```

### Why This Matters
- Tests may import the wrong files (compiled JS in src/ instead of TS files)
- Version control will show many untracked files
- Build outputs become inconsistent
- It violates the principle of clear separation between source and build artifacts