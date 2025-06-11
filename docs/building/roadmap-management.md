# Roadmap Management

This document describes how the MMT project manages its development roadmap using GitHub's built-in features.

## Overview

MMT uses GitHub Milestones to organize development work into phases. This provides a simple, maintainable way to track progress without the overhead of GitHub Projects.

## Milestone-Based Roadmap

### Why Milestones?

We chose GitHub Milestones over GitHub Projects because:

1. **Simplicity**: Milestones are built into GitHub's issue system
2. **Visibility**: Each issue shows its milestone directly in the issue list
3. **Easy Filtering**: Click any milestone to see all related issues
4. **No Maintenance**: No columns to manage or cards to move
5. **Direct URLs**: Each phase has a permanent, shareable URL

## Working with Milestones

### Viewing the Roadmap

- **All Phases**: View milestones in your GitHub repository
- **Current Phase**: Click on the active milestone
- **All Issues**: Filter by milestone to see related work

### For Contributors

When creating a new issue:
1. Consider which phase it belongs to
2. Assign the appropriate milestone
3. Add relevant labels for priority, type

### Using GitHub CLI

```bash
# View issues in current phase
gh issue list --milestone "Milestone 1: Foundation & Core"

# Assign issue to a phase
gh issue edit 123 --milestone "Milestone 2: Local Indexing System"

# Create issue with milestone
gh issue create --title "New feature" --milestone "Milestone 3: Document Operations"
```

## Issue Organization

### Labels

We use labels to categorize issues within phases by type:
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `performance`: Performance-related issues
- `testing`: Test improvements or additions

### Priority

Within each phase, issues are prioritized by:
1. Blocking issues (preventing other work)
2. User-facing improvements
3. Developer experience enhancements
4. Technical debt reduction

## Roadmap Updates

The roadmap is reviewed and updated:
- At the start of each phase
- When significant progress is made
- When priorities shift based on user feedback

To propose roadmap changes:
1. Open an issue describing the proposed change
2. Label it with `roadmap-discussion`
3. Reference any related issues

## MMT Milestones

### Current Milestones
1. **Foundation & Core** - Basic packages and infrastructure
2. **Local Indexing System** - Query parser and indexer
3. **Document Operations** - File operations with link integrity
4. **UI & Table View** - React components and state management
5. **Integration & Polish** - Wire everything together
6. **QM Enhancement** - Optional vector similarity features

Each milestone contains specific issues with test requirements defined upfront, ensuring we build exactly what's needed.
