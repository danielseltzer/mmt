# Package Build Troubleshooting Guide

This guide documents common issues when packages fail to build and their solutions.

## Symptom: TypeScript Cannot Find Module

When you see errors like:
```
error TS2307: Cannot find module '@mmt/package-name' or its corresponding type declarations.
```

## Solution Process

### 1. Check package.json exports field

**CRITICAL**: All packages must have an `exports` field for proper ES module resolution.

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

Compare the failing package's package.json with a working package (e.g., @mmt/config).

### 2. Check tsconfig.json consistency

Ensure tsconfig.json matches working packages:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

### 3. Verify index.js generation

TypeScript only generates JavaScript for modules with actual code. Pure re-export modules might need at least one import or const declaration.

Check if dist/index.js exists after build:
```bash
find packages/[package-name]/dist -name "index.js"
```

### 4. Run clean build cycle

```bash
pnpm clean
pnpm install
pnpm build
```

## Key Learnings

1. **Always compare with working packages** - Don't guess, compare configurations
2. **The `exports` field is critical** for ES module packages
3. **TypeScript composite projects** require proper configuration
4. **Document the solution** for future agent sessions

## Working Package Reference

Use @mmt/config as the reference for correct package configuration:
- Has proper exports field
- Correct tsconfig.json setup
- Builds successfully