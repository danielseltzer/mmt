# Code Analysis Tools

This directory contains the output of dependency analysis tools used to monitor and improve the quality of the MMT codebase.

## Available Tools

The following analysis tools are available:

1. **Dependency Cruiser**: Analyzes dependencies between files and modules
   - Validates dependency rules (no circular dependencies, proper package boundaries)
   - Generates visual dependency graphs
   - Detects architectural violations

## Running the Analysis

You can run all analysis tools at once using the following command:

```bash
pnpm run analyze:all
```

This will:
1. Create a date-based directory for the current run (e.g., `code-analysis/2025-06-25/`)
2. Run all analysis tools and save their output to the appropriate subdirectories
3. Generate a summary report
4. Compare results with the previous run to highlight changes

## Output Structure

The output is organized into a date-based folder structure:

```
/code-analysis/
  /YYYY-MM-DD/
    /dependency-graph/
      - dependency-architecture.svg  # High-level package architecture view
      - dependency-detailed.svg      # Detailed file-level dependencies
      - dependency-folder.svg        # Folder structure dependencies
      - dependency-graph.pdf         # PDF version of the dependency graph
      - dependency-analysis.json     # Raw analysis data
      - validation-report.txt        # Rule validation results
    - analysis-summary.md            # Summary report
```

## Individual Tools

You can also run each tool individually:

```bash
# Dependency Cruiser
pnpm run dep:validate      # Validate dependency rules
pnpm run dep:all          # Generate all dependency graphs
pnpm run dep:architecture # Generate architecture-level graph
pnpm run dep:detailed     # Generate detailed file-level graph
pnpm run dep:folder       # Generate folder-level graph
pnpm run dep:packages     # Generate package entry points only graph
```

## Dependency Rules

The project enforces the following dependency rules (configured in `.dependency-cruiser.cjs`):

1. **No Circular Dependencies**: Modules cannot have circular relationships
2. **No Orphans**: All modules must be used (with exceptions for config files)
3. **Package Boundaries**: Packages can only depend on each other through `@mmt/entities` schemas
4. **No Deprecated Dependencies**: Cannot use deprecated npm packages or Node.js core modules

## Prerequisites

To run the analysis tools, you need:

1. **dependency-cruiser**: Installed as a dev dependency
2. **graphviz**: For generating SVG and PDF visualizations
   - macOS: `brew install graphviz`
   - Ubuntu/Debian: `sudo apt-get install graphviz`
   - Windows: `choco install graphviz`

## Interpreting Results

### Architecture Graph (`dependency-architecture.svg`)
Shows high-level dependencies between packages. Ideal for understanding the overall system structure.

### Detailed Graph (`dependency-detailed.svg`)
Shows file-level dependencies. Useful for identifying specific coupling between modules.

### Folder Graph (`dependency-folder.svg`)
Shows dependencies organized by folder structure. Helps identify which parts of the system are most interconnected.

### Validation Report
Lists any violations of the configured dependency rules. These should be addressed to maintain clean architecture.

## Comparing Runs

The `analyze:all` command automatically compares the current run with the previous one, showing:
- Changes in total modules analyzed
- Changes in violations (errors, warnings, info)
- Differences in dependency counts

This helps track whether the codebase architecture is improving or degrading over time.