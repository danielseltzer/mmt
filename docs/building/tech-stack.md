# MMT Technical Stack

This document outlines the technologies, libraries, and architecture decisions for the Markdown Management Toolkit (MMT).

## Core Technologies

- **Runtime**: Electron 31.x with Node.js 20.x
- **Language**: TypeScript 5.5 with strict mode
- **Package Manager**: pnpm 9.x
- **UI Framework**: React 18

## Project Structure & Build System

- **Monorepo Management**: pnpm workspaces + Turborepo
- **Build Tools**:
  - electron-vite for Electron apps
  - Vite for React development
  - TypeScript compiler for packages
  - Vitest for testing
  - ESLint for code quality

## Desktop Application Stack

- **Framework**: Electron with electron-vite
- **IPC Layer**: electron-trpc for type-safe communication
- **Security**: Context isolation, no node integration in renderer

## UI Libraries

- **Framework**: React 18 with TypeScript
- **Table Component**: TanStack Table 8.x
- **Styling**: Tailwind CSS 3.x
- **Icons**: Heroicons 2.x
- **State Management**: Zustand 4.x

## Data Processing Libraries

- **Schema Validation**: Zod 3.x for runtime validation
- **YAML Processing**: js-yaml 4.x for config files
- **Markdown Parsing**: gray-matter 4.x for frontmatter
- **File Watching**: chokidar 3.x for cross-platform reliability
- **Path Matching**: minimatch for glob patterns

## Configuration Management

- **Approach**:
  - YAML configuration files with explicit paths
  - Required `--config` flag at startup - NO DEFAULTS
  - No environment variables - explicit config only
  - Fail fast on missing or invalid configuration
  - All paths must be absolute and exist

- **Validation**:
  - Zod schemas for all configuration
  - Detailed error messages with examples
  - Exit process on invalid config
  - Type-safe configuration objects

## Dependency Management

- **Strategy**:
  - pnpm for package management
  - Workspace support for monorepo
  - Clear separation between dependencies and devDependencies
  - Pinned versions for third-party packages

## Project Organization

The MMT project is organized as a monorepo with the following structure:

### Core Packages (`/packages/*`)
1. **entities**: Shared Zod schemas (the contracts between packages)
2. **filesystem-access**: Centralized file operations layer
3. **config**: Configuration loading and validation
4. **query-parser**: GitHub-style query syntax parsing
5. **indexer**: Local file indexing (Dataview-inspired)
6. **qm-provider**: Optional vector similarity search
7. **document-operations**: Bulk file operations with snapshots
8. **file-relocator**: Link integrity maintenance
9. **document-previews**: Preview generation
10. **docset-builder**: Query execution and result building
11. **view-persistence**: Save/load table configurations
12. **table-view**: React table component
13. **reports**: Export functionality (CSV, etc.)

### Applications (`/apps/*`)
- **electron**: Main process application
- **renderer**: React UI application

### Documentation (`/docs/*`)
- **planning/**: Architecture and design documents
- **building/**: Development standards and practices