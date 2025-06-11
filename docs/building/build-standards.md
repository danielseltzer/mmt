# Build Standards

This document outlines the standard build configuration for all packages in the MMT project. Following these standards ensures consistency across the codebase and helps prevent common issues.

## Directory Structure

Each package should follow this standard directory structure:

```
packages/package-name/
├── src/                  # Source code
│   ├── __tests__/        # Tests
│   │   ├── unit/         # Unit tests
│   │   └── integration/  # Integration tests
│   ├── index.ts          # Main entry point
│   └── ...               # Other source files
├── dist/                 # Compiled output (generated)
├── package.json          # Package configuration
└── tsconfig.json         # TypeScript configuration
```

## TypeScript Configuration

Each package should have a `tsconfig.json` file with the following configuration:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true,
    "tsBuildInfoFile": "./.turbo/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [
    // Add references to other packages as needed
  ]
}
```

Key points:
- `rootDir` should be set to `./src` to ensure all source files are in the src directory
- `outDir` should be set to `./dist` to ensure all compiled files go to the dist directory
- `composite` must be set to `true` for TypeScript project references to work
- `tsBuildInfoFile` should be set to `./.turbo/tsconfig.tsbuildinfo` for Turborepo compatibility
- `include` should contain `src/**/*` to include all files in the src directory
- `exclude` should contain `["node_modules", "dist", "**/*.test.ts"]` to avoid compiling test files
- `references` should list all workspace dependencies for proper build ordering

## Package.json Configuration

Each package should have a `package.json` file with the following configuration:

```json
{
  "name": "@mmt/package-name",
  "version": "0.1.0",
  "description": "Package description",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rimraf dist .turbo tsconfig.tsbuildinfo",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    // Package dependencies
  },
  "devDependencies": {
    // Development dependencies
  }
}
```

Key points:
- `main` should be set to `dist/index.js` to point to the compiled entry point
- `types` should be set to `dist/index.d.ts` to point to the TypeScript declarations
- `exports` should be configured to support both ESM imports and TypeScript types
- `scripts` should include standard commands for building, testing, and linting

## Build Process

The build process should follow these steps:

1. Clean the output directory: `rimraf dist .turbo tsconfig.tsbuildinfo`
2. Compile TypeScript: `tsc --build`

The compiled output should go to the `dist` directory, not the `src` directory. No compiled files (`.js` or `.d.ts`) should be committed to the repository.

## Verification

You can verify that your package follows these standards by running:

```bash
pnpm verify:build
```

This script checks for:
1. Compiled files in the src directory
2. Consistent tsconfig.json configuration
3. Consistent package.json configuration

## Common Issues and Solutions

### Compiled Files in src Directory

**Issue**: Compiled `.js` and `.d.ts` files are present in the src directory.

**Solution**: 
1. Remove the compiled files from the src directory
2. Ensure tsconfig.json has `outDir` set to `./dist`
3. Run `pnpm clean` followed by `pnpm build`

### Inconsistent Build Scripts

**Issue**: Build scripts vary across packages.

**Solution**:
1. Update package.json to use the standard scripts
2. Ensure all packages use the same build process

### Missing TypeScript Configuration

**Issue**: tsconfig.json is missing or has incorrect configuration.

**Solution**:
1. Create or update tsconfig.json based on the standard configuration
2. Ensure it extends the base configuration and has the correct compiler options

## Conclusion

Following these build standards ensures consistency across the codebase and helps prevent common issues. If you have questions or need help with your package configuration, please refer to this document or ask for assistance.
