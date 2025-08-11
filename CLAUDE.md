# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MMT (Markdown Management Toolkit) is a desktop application for managing large collections of markdown files (5000+) with bulk operations, sophisticated filtering, and optional AI-powered similarity search. Currently in planning phase with extensive documentation but no code implementation yet.

## Common Development Commands

Since the project has no code yet, you'll need to bootstrap it first:

```bash
# Initialize monorepo (first time setup)
pnpm init
pnpm add -D turbo typescript @types/node

# After packages are created:
pnpm install              # Install all dependencies
pnpm dev                  # Start development mode
pnpm build               # Build all packages
pnpm test                # Run all tests
pnpm lint                # Run linting
pnpm type-check          # Check TypeScript types

# Run commands for specific package
pnpm --filter @mmt/indexer test
pnpm --filter @mmt/indexer dev

# Start app with config
pnpm dev -- --config test-config.yaml
```

## High-Level Architecture

### Monorepo Structure
- **13 single-responsibility packages** under `/packages/*`
- **2 applications** under `/apps/*` 
- Built with pnpm workspaces + Turborepo
- All packages communicate through Zod schemas in `@mmt/entities`

### Core Technology Stack
- **React 18** with TypeScript for UI
- **Zod** schemas as contracts between packages
- **TanStack Table** for data display
- **Tailwind CSS** for styling

### Key Architectural Principles

1. **NO MOCKS POLICY**: Test only with real file operations in temp directories
2. **NO DEFAULTS**: All configuration must be explicit via --config flag
3. **Schema-Driven**: Zod schemas define all data contracts
4. **Test-First Development**: Write failing tests before implementation
5. **Performance Target**: Index 5000 files in < 5 seconds

### Package Dependencies Flow
```
entities (schemas) → all other packages
filesystem-access → config, indexer, operations
config → main app initialization
query-parser → indexer → docset-builder
indexer + operations → file-relocator
table-view → renderer app
```

## Current Status & Next Steps

The project is documented but not yet implemented. Follow these steps:

1. **Check folder name**: Should be "mmt" not "md-blade"
2. **Bootstrap project**: Run commands from `/docs/planning/project-bootstrap.md`
3. **Create GitHub repo**: Set up milestones and issues as documented
4. **Start with Issue #1**: Initialize monorepo structure
5. **Follow TDD**: Write tests first for each component

## Important Implementation Notes

- **File Operations**: All file access MUST go through `@mmt/filesystem-access`
- **Testing**: Use real files in OS temp directories - never mock filesystem
- **Config**: Require explicit --config flag, fail fast on invalid config
- **Errors**: Fail fast with clear messages, no silent failures
- **Performance**: Keep indexing under 5 seconds for 5000 files
- **NO BACKWARD COMPATIBILITY**: I am the only user. Never add backward compatibility, aliases, or legacy support. Keep the codebase clean and simple. When updating APIs or interfaces, directly change them - do not maintain old versions.
- **File Watching**: Indexer supports automatic updates via `fileWatching` config or `--watch` CLI flag. See `/docs/features/file-watching.md`

## MUST READ: Critical Documentation

**⚠️ REQUIRED READING before writing any code:**

1. **[Testing Strategy](/docs/building/testing-strategy.md)** - ABSOLUTE RULE: NO MOCKS ALLOWED
   - Zero tolerance for mocks, stubs, or test doubles
   - Test with real files in temp directories only
   - Explains why mocks are harmful and our real-world testing approach

2. **[Engineering Principles](/docs/building/principles.md)** - Core development rules
   - Explicit over implicit (NO DEFAULTS policy)
   - Schema-driven architecture with Zod
   - Test-first development (TDD)
   - Fail fast and clear

3. **[Monorepo Practices](/docs/building/monorepo-practices.md)** - How we structure packages
   - Single responsibility per package
   - Dependencies flow in one direction
   - Packages communicate only through schemas

4. **[Tech Stack](/docs/building/tech-stack.md)** - Technology choices and rationale
   - Why specific libraries were chosen
   - Configuration management approach
   - Package organization strategy

## Additional Documentation

- **Product Requirements**: `/docs/planning/PRD.md`
- **Technical Architecture**: `/docs/planning/technical-architecture.md`
- **Implementation Guide**: `/docs/planning/implementation-guide.md` (detailed code examples)
- **Package Details**: `/docs/planning/package-boundaries.md`
- **Bootstrap Checklist**: `/docs/planning/project-bootstrap.md`
- **Issues & Milestones**: `/docs/planning/issues-milestones.md`