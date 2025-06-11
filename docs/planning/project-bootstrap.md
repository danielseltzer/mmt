# MMT Project Bootstrap

This checklist guides you through setting up the MMT project from documentation to a working GitHub repository with issues ready for implementation.

## 1. Initialize Local Repository

```bash
# Create project directory
mkdir mmt && cd mmt
git init

# Create initial structure
mkdir -p packages apps docs
mkdir -p docs/{planning,building}

# Copy documentation files
cp -r /path/to/md-blade/docs/* docs/

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.turbo/
*.log
.DS_Store
coverage/
.env
*.tsbuildinfo
.snapshots/
.operations/
EOF

# Initial commit
git add .
git commit -m "Initial commit: Architecture and planning documentation"
```

## 2. Create Monorepo Foundation

```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "mmt",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF

# Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
EOF

# Create base tsconfig
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "composite": true
  }
}
EOF

# Create README
cat > README.md << 'EOF'
# MMT - Markdown Management Toolkit

A desktop application for managing large markdown vaults with bulk operations, sophisticated filtering, and optional vector similarity search.

## Documentation

- [Product Requirements](docs/planning/PRD.md)
- [Technical Architecture](docs/planning/technical-architecture.md)
- [Implementation Guide](docs/planning/implementation-guide.md)
- [Engineering Principles](docs/building/principles.md)

## Development

See [Implementation Guide](docs/planning/implementation-guide.md) for setup instructions.
EOF

git add .
git commit -m "Add monorepo foundation"
```

## 3. Push to GitHub

```bash
# Create repo on GitHub (using gh CLI)
gh repo create mmt --private --description "Markdown Management Toolkit"

# Or manually create on GitHub, then:
git remote add origin git@github.com:yourusername/mmt.git
git branch -M main
git push -u origin main
```

## 4. Set Up GitHub Milestones

```bash
# Create milestones
gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 1: Foundation & Core" \
  -f description="Set up monorepo structure and foundational packages" \
  -f due_on="2025-01-25T00:00:00Z"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 2: Local Indexing System" \
  -f description="Build local file indexing based on Dataview patterns"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 3: Document Operations" \
  -f description="Implement file operations with link integrity"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 4: UI & Table View" \
  -f description="Build the React UI with table view"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 5: Integration & Polish" \
  -f description="Wire everything together, test, and polish"

gh api repos/:owner/:repo/milestones \
  --method POST \
  -f title="Milestone 6: QM Enhancement" \
  -f description="Add optional vector similarity search via QM"
```

## 5. Create Issue Labels

```bash
# Priority labels
gh label create p0 --description "MVP blocker" --color FF0000
gh label create p1 --description "Important for MVP" --color FF6600
gh label create p2 --description "Nice to have" --color FFAA00
gh label create p3 --description "Future enhancement" --color FFDD00

# Type labels
gh label create package --description "New package development" --color 0E8A16
gh label create feature --description "New user feature" --color 0E8A16
gh label create infrastructure --description "Build/test/tooling" --color 006B75
gh label create testing --description "Test improvements" --color FBCA04

# Status labels
gh label create ready --description "Ready to start" --color 0E8A16
gh label create in-progress --description "Being worked on" --color FBCA04
gh label create blocked --description "Waiting on dependency" --color D93F0B
```

## 6. Create Initial Issues

Create a script to bulk create issues from our planning document:

```bash
# Create the issues creation script
cat > create-issues.sh << 'EOF'
#!/bin/bash

# Milestone 1 Issues
gh issue create \
  --title "Issue #1: Initialize Monorepo Structure" \
  --body "Create Electron + React + TypeScript monorepo using electron-vite. See docs/planning/issues-milestones.md for full details and test requirements." \
  --milestone "Milestone 1: Foundation & Core" \
  --label "setup,infrastructure,p0"

gh issue create \
  --title "Issue #2: Create Entities Package" \
  --body "Create @mmt/entities package with all Zod schemas. See docs/planning/issues-milestones.md for test requirements." \
  --milestone "Milestone 1: Foundation & Core" \
  --label "package,entities,p0"

gh issue create \
  --title "Issue #3: Implement FileSystem Access Package" \
  --body "Create @mmt/filesystem-access as centralized file operations layer. NO MOCKS in tests. See docs/planning/issues-milestones.md." \
  --milestone "Milestone 1: Foundation & Core" \
  --label "package,filesystem-access,p0"

gh issue create \
  --title "Issue #4: Create Config Package" \
  --body "Create @mmt/config for explicit configuration. No defaults, require --config flag. See docs/planning/issues-milestones.md." \
  --milestone "Milestone 1: Foundation & Core" \
  --label "package,config,p0"

# Milestone 2 Issues
gh issue create \
  --title "Issue #5: Create Query Parser Package" \
  --body "Implement GitHub-style query syntax parser. See docs/planning/issues-milestones.md for test cases." \
  --milestone "Milestone 2: Local Indexing System" \
  --label "package,query-parser,p0"

gh issue create \
  --title "Issue #6: Build Indexer Package (Dataview-inspired)" \
  --body "Create local file indexing based on Dataview patterns. Must handle 5000 files in < 5 seconds. See docs/planning/issues-milestones.md." \
  --milestone "Milestone 2: Local Indexing System" \
  --label "package,indexer,p0"

# Continue for all 21 issues...
echo "Add remaining issues following the pattern above"
EOF

chmod +x create-issues.sh
./create-issues.sh
```

## 7. Create Development Guidelines

```bash
# Create CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# Contributing to MMT

## Development Process

1. Pick an issue from the current milestone
2. Create a feature branch: `feature/issue-XX-description`
3. Write tests FIRST (TDD)
4. Implement the solution
5. Create PR with test results

## Key Rules

- **NO MOCKS** in tests - use real implementations
- All configs must be explicit - no defaults
- Test with real files in temp directories
- Follow the principles in docs/building/principles.md
- Write tests before implementation

## Getting Started

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Start development
pnpm dev
```

## Code Standards

- Functions < 50 lines
- Files < 300 lines
- Every package has @fileoverview docs
- Comments explain WHY, not WHAT
EOF

git add .
git commit -m "Add contributing guidelines"
git push
```

## 8. Set Up Development Environment

```bash
# Install dependencies
pnpm install

# Create a test config for development
cat > test-config.yaml << 'EOF'
vaultPath: /path/to/test-vault
# qmServiceUrl: http://localhost:8080  # Optional
EOF

# Create a small test vault
mkdir -p test-vault
echo "# Test Document" > test-vault/test.md
```

## 9. Optional: GitHub Actions CI

```bash
# Create CI workflow
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm type-check
EOF

git add .
git commit -m "Add GitHub Actions CI"
git push
```

## 10. Ready for Development!

Your repository is now set up with:
- ✅ Monorepo structure
- ✅ GitHub milestones
- ✅ Issue labels
- ✅ Initial issues (partial - complete the script)
- ✅ Contributing guidelines
- ✅ CI pipeline (optional)

**Next steps:**
1. Complete the issue creation script with all 21 issues
2. Start with Issue #1: Initialize Monorepo Structure
3. Follow TDD: Write tests first!
4. Create PRs for each issue

Remember: NO MOCKS, explicit config only, test with real files!