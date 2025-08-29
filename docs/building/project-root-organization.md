# Project Root Organization

This document defines the rules and rationale for maintaining a clean, organized project root directory in the MMT repository.

## Purpose

A clean root directory provides several benefits:

- **Clarity**: Easy to understand the project structure at a glance
- **Maintainability**: Reduces configuration drift and orphaned files
- **Onboarding**: New contributors can quickly understand the project layout
- **Tooling**: Build tools and IDEs work more reliably with predictable structure
- **Automation**: Easier to write scripts that assume specific file locations

## Enforcement

Project root organization is automatically enforced by the stability check script:

```bash
node tools/check-stability.js
```

This script validates that only approved files and directories exist in the project root and will fail CI if violations are detected.

## Allowed Root Files

The following files are permitted in the project root, organized by category:

### Documentation Files
- **`README.md`** - Primary project documentation and quick start guide
- **`CLAUDE.md`** - AI assistant instructions and project context
- **`handoff.md`** - Session-specific documentation and handoff notes

### Package Management
- **`package.json`** - Root package configuration and workspace definition
- **`pnpm-lock.yaml`** - Dependency lock file for reproducible installs
- **`pnpm-workspace.yaml`** - Workspace configuration for monorepo
- **`.npmrc`** - npm configuration settings

### Build & Development Tools
- **`turbo.json`** - Turborepo build pipeline configuration
- **`tsconfig.json`** - Root TypeScript configuration
- **`tsconfig.base.json`** - Shared TypeScript configuration for packages
- **`eslint.config.js`** - ESLint configuration for the entire project
- **`.eslintignore`** - Files to exclude from linting

### Git & Version Control
- **`.gitignore`** - Files and directories to exclude from Git
- **`LICENSE`** - Project license file

### Dependency Management
- **`.dependency-cruiser.cjs`** - Dependency analysis and validation rules

### Development Environment
- **`.env.local`** - Local environment variables (gitignored)
- **`.trackdown.yaml`** - Issue tracking configuration
- **`.DS_Store`** - macOS system file (gitignored but sometimes present)

## Allowed Root Directories

The following directories are permitted in the project root:

### Version Control & System
- **`.git/`** - Git repository metadata
- **`.claude/`** - Claude AI assistant configuration and cache
- **`.claude-mpm/`** - Claude MPM (package manager) configuration
- **`node_modules/`** - Installed dependencies
- **`.turbo/`** - Turborepo cache directory
- **`.idea/`** - JetBrains IDE configuration

### Monorepo Structure
- **`apps/`** - Application packages (CLI, web, API server)
- **`packages/`** - Library packages used by applications

### Development & Operations
- **`tools/`** - Development tools and utility scripts
- **`bin/`** - Executable scripts for running the application
- **`scripts/`** - Build, test, and development automation scripts
- **`tests/`** - End-to-end and integration test files

### Documentation & Configuration
- **`docs/`** - Comprehensive project documentation
- **`config/`** - Configuration files and examples
- **`data/`** - Runtime data storage (databases, caches)
- **`logs/`** - Application and system logs
- **`reports/`** - Generated analysis and test reports

### Analysis & Temporary
- **`code-analysis/`** - Automated code analysis results
- **`.mmt-data/`** - Application data directory
- **`.prompt-cache/`** - AI prompt caching

## What Goes Where

### Configuration Files
- **Root level**: Only global configurations that affect the entire project (ESLint, TypeScript, Turbo, package.json)
- **`/config/`** directory: Application-specific configuration files, examples, and environment-specific configs

### Scripts and Tools
- **`/tools/`**: Development utilities, health checks, analysis scripts
- **`/scripts/`**: Build automation, setup scripts, deployment helpers
- **`/bin/`**: User-facing executable scripts

### Documentation
- **Root level**: Primary README, AI instructions, immediate handoff notes
- **`/docs/`**: Comprehensive documentation organized by topic

### Data and Logs
- **`/data/`**: Runtime application data (vector databases, indexes)
- **`/logs/`**: Application logs, debug output, error reports
- **`/reports/`**: Generated analysis results, test coverage, performance reports

## Adding New Items to Root

Before adding any new file or directory to the project root:

1. **Check if it belongs elsewhere**: Most files should go in dedicated directories
2. **Review existing patterns**: Look for similar files and where they're located
3. **Update the stability check**: Add the item to the appropriate set in `/tools/check-stability.js`:
   - Add to `ALLOWED_ROOT_FILES` for files
   - Add to `ALLOWED_ROOT_DIRS` for directories
4. **Document the decision**: Update this documentation with the new item and its purpose
5. **Test the change**: Run `node tools/check-stability.js` to ensure it passes

### Questions to Ask Before Adding Root Items

- **Is this truly global?** Does it affect the entire project or just one component?
- **Is there a dedicated directory?** Can this file live in `/config/`, `/tools/`, `/docs/`, etc.?
- **Is it temporary?** Consider if this is a permanent addition or debugging artifact
- **Does it follow conventions?** Look at similar tools/frameworks to see where they place such files

## Examples of What Should NOT Be in Root

### Bad Examples
```
❌ debug.log                    → should be in /logs/
❌ test-config.yaml            → should be in /config/test/
❌ analyze-packages.mjs        → should be in /tools/ or /scripts/
❌ temp-notes.md               → should be in appropriate /docs/ subdirectory
❌ component-analysis.json     → should be in /reports/ or /code-analysis/
❌ experimental-features.md    → should be in /docs/planning/ or similar
```

### Good Examples
```
✅ README.md                   → primary project documentation
✅ package.json                → workspace definition
✅ turbo.json                  → build pipeline configuration
✅ /tools/check-stability.js   → development utility
✅ /config/example.yaml        → application configuration
✅ /docs/planning/PRD.md       → detailed documentation
```

## Maintenance

### Regular Cleanup
- Review root directory monthly for drift
- Run stability checks in CI/CD pipeline  
- Remove temporary files and outdated configurations
- Archive old documentation to appropriate `/docs/` subdirectories

### When Refactoring
- Always update both the stability check script and this documentation
- Consider the impact on developer workflows
- Maintain backward compatibility for critical paths like `/bin/` scripts

## Related Documentation

- [Monorepo Practices](/docs/building/monorepo-practices.md) - Package organization principles
- [Development Workflow](/docs/building/development-workflow.md) - Daily development practices
- [Build Standards](/docs/building/build-standards.md) - Build and deployment requirements

## Enforcement Script Location

**Script**: `/tools/check-stability.js`

This script is the authoritative source for what files and directories are allowed in the project root. When in doubt, refer to the `ALLOWED_ROOT_FILES` and `ALLOWED_ROOT_DIRS` sets in that script.