#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const testVaultPath = './test-vault';

// Create test vault directory
if (!existsSync(testVaultPath)) {
  mkdirSync(testVaultPath, { recursive: true });
  console.log(`Created test vault at ${testVaultPath}`);
}

// Create some sample markdown files
const sampleFiles = [
  {
    path: 'README.md',
    content: `# Test Vault

This is a test vault for MMT development.

## Features
- Sample markdown files
- Various document types
- Test data for development
`
  },
  {
    path: 'notes/daily/2024-01-01.md',
    content: `# Daily Note - 2024-01-01

## Tasks
- [ ] Test MMT search functionality
- [ ] Verify table view works
- [x] Create test documents

## Notes
Today I'm testing the MMT application with some sample data.
`
  },
  {
    path: 'notes/daily/2024-01-02.md',
    content: `# Daily Note - 2024-01-02

## Meeting Notes
Discussed MMT architecture:
- Web-based UI
- REST API
- File indexing
- Query capabilities
`
  },
  {
    path: 'projects/mmt.md',
    content: `# MMT Project

Markdown Management Toolkit for handling large collections of markdown files.

## Architecture
- Express API server
- React web interface
- File system indexer
- Query parser

## Goals
- Fast indexing
- Powerful search
- Bulk operations
`
  },
  {
    path: 'reference/markdown-syntax.md',
    content: `# Markdown Syntax Reference

## Headers
# H1
## H2
### H3

## Lists
- Item 1
- Item 2
  - Nested item

## Links
[Link text](http://example.com)

## Code
\`\`\`javascript
const hello = "world";
\`\`\`
`
  }
];

// Create sample files
for (const file of sampleFiles) {
  const filePath = join(testVaultPath, file.path);
  const dir = join(testVaultPath, file.path.split('/').slice(0, -1).join('/'));
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(filePath, file.content);
  console.log(`Created ${file.path}`);
}

console.log('\nTest vault setup complete!');
console.log(`Total files created: ${sampleFiles.length}`);