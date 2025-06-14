#!/usr/bin/env node
/**
 * @fileoverview Generates a query syntax reference from code
 */

import { readFile } from 'node:fs/promises';

/**
 * Extract JSDoc comments and their associated code
 */
async function extractQuerySyntax() {
  const entitiesCode = await readFile('packages/entities/src/index.ts', 'utf-8');
  
  // Extract namespace pattern from refine function
  const namespaceMatch = entitiesCode.match(/const namespacePattern = \/\\\^\\\((.*?)\\\):/);
  const namespaces = namespaceMatch ? namespaceMatch[1].split('|') : ['fs', 'fm', 'content', 'inline'];
  
  // Extract operator examples from QueryOperatorSchema JSDoc
  const operatorSection = entitiesCode.match(/\/\*\*[\s\S]*?\*\/\s*export const QueryOperatorSchema/);
  const operatorExamples = [];
  if (operatorSection) {
    const examples = operatorSection[0].matchAll(/@example (.*)/g);
    for (const match of examples) {
      operatorExamples.push(match[1]);
    }
  }
  
  // Extract structured query properties
  const structuredMatch = entitiesCode.match(/export const StructuredQuerySchema = z\.object\(\{([\s\S]*?)\}\);/);
  
  const queryStructure = {
    namespaces: {},
    operators: {}
  };
  
  // Parse filesystem properties
  const fsBlock = structuredMatch[0].match(/filesystem: z\.object\(\{([\s\S]*?)\}\)\.optional/);
  if (fsBlock) {
    const properties = {};
    const propMatches = fsBlock[1].matchAll(/\/\*\* @matcher (.*?) - (.*?) \*\/\s*(\w+):/g);
    for (const match of propMatches) {
      properties[match[3]] = {
        matcher: match[1],
        description: match[2]
      };
    }
    queryStructure.namespaces['fs:'] = {
      description: 'Query filesystem properties',
      properties
    };
  }
  
  // Extract content namespace
  const contentBlock = structuredMatch[0].match(/content: z\.object\(\{([\s\S]*?)\}\)\.optional/);
  if (contentBlock) {
    const properties = {};
    const propMatches = contentBlock[1].matchAll(/\/\*\* @matcher (.*?) - (.*?) \*\/\s*(\w+):/g);
    for (const match of propMatches) {
      properties[match[3]] = {
        matcher: match[1],
        description: match[2]
      };
    }
    queryStructure.namespaces['content:'] = {
      description: 'Search document content',
      properties
    };
  }
  
  // Add dynamic frontmatter namespace
  queryStructure.namespaces['fm:'] = {
    description: 'Query frontmatter properties',
    properties: {
      '*': {
        matcher: 'operator',
        description: 'Any frontmatter property can be queried'
      }
    }
  };
  
  // Extract inline namespace
  const inlineBlock = structuredMatch[0].match(/inline: z\.object\(\{([\s\S]*?)\}\)\.optional/);
  if (inlineBlock) {
    const properties = {};
    const propMatches = inlineBlock[1].matchAll(/\/\*\* @matcher (.*?) - (.*?) \*\/\s*(\w+):/g);
    for (const match of propMatches) {
      properties[match[3]] = {
        matcher: match[1],
        description: match[2]
      };
    }
    queryStructure.namespaces['inline:'] = {
      description: 'Query inline tags like #todo',
      properties
    };
  }
  
  // Extract operator descriptions
  const operatorBlock = entitiesCode.match(/z\.object\(\{([\s\S]*?)\}\),/);
  if (operatorBlock) {
    const opMatches = operatorBlock[1].matchAll(/\/\*\* @description (.*?) \*\/\s*(\w+):/g);
    for (const match of opMatches) {
      queryStructure.operators[match[2]] = match[1];
    }
  }
  
  return { queryStructure, namespaces, operatorExamples };
}

/**
 * Generate markdown report
 */
function generateReport(data) {
  const lines = ['# MMT Query Syntax Reference', ''];
  lines.push('*Generated from code documentation*', '');
  
  // Query Format
  lines.push('## Query Format', '');
  lines.push('Queries use namespace:property syntax in a single object:', '');
  lines.push('```typescript');
  lines.push('vault.select({');
  lines.push('  \'fs:path\': \'posts/**\',');
  lines.push('  \'fm:status\': \'draft\',');
  lines.push('  \'fm:tag\': [\'blog\', \'tech\'],');
  lines.push('  \'content:text\': \'TODO\'');
  lines.push('});');
  lines.push('```', '');
  
  // Namespaces
  lines.push('## Namespaces', '');
  lines.push(`Available namespaces: \`${data.namespaces.join('`, `')}\``, '');
  
  for (const [ns, info] of Object.entries(data.queryStructure.namespaces)) {
    lines.push(`### ${ns} - ${info.description}`, '');
    
    if (Object.keys(info.properties).length > 0) {
      lines.push('| Property | Matcher | Description |');
      lines.push('|----------|---------|-------------|');
      
      for (const [prop, details] of Object.entries(info.properties)) {
        const propName = prop === '*' ? '(any)' : prop;
        lines.push(`| ${propName} | ${details.matcher} | ${details.description} |`);
      }
      lines.push('');
    }
  }
  
  // Operators
  lines.push('## Query Operators', '');
  lines.push('Values can be simple (exact match) or use operators:', '');
  lines.push('');
  
  // Examples first
  if (data.operatorExamples.length > 0) {
    lines.push('**Examples:**');
    lines.push('```typescript');
    for (const example of data.operatorExamples) {
      lines.push(example);
    }
    lines.push('```', '');
  }
  
  // Operator reference
  lines.push('**Available Operators:**');
  lines.push('');
  lines.push('| Operator | Description |');
  lines.push('|----------|-------------|');
  lines.push('| (direct) | Exact match |');
  
  for (const [op, desc] of Object.entries(data.queryStructure.operators)) {
    lines.push(`| ${op} | ${desc} |`);
  }
  
  lines.push('');
  lines.push('**Operator Examples:**');
  lines.push('```typescript');
  lines.push('// Direct values (exact match)');
  lines.push('"draft"                              // String exact match');
  lines.push('["blog", "tech"]                     // Array must contain all values');
  lines.push('');
  lines.push('// Comparison operators');
  lines.push('{ gt: "2024-01-01" }                 // Greater than');
  lines.push('{ gte: 100 }                         // Greater than or equal');
  lines.push('{ lt: "2024-12-31" }                 // Less than');
  lines.push('{ lte: 1000 }                        // Less than or equal');
  lines.push('');
  lines.push('// Equality operators');
  lines.push('{ eq: "exact-value" }                // Equal to (explicit)');
  lines.push('{ ne: "excluded" }                   // Not equal to');
  lines.push('');
  lines.push('// Array operators');
  lines.push('{ in: ["option1", "option2"] }       // Value in array');
  lines.push('{ nin: ["excluded1", "excluded2"] }  // Value not in array');
  lines.push('{ contains: "item" }                 // Array contains value');
  lines.push('{ containsAll: ["req1", "req2"] }    // Array contains all values');
  lines.push('{ containsAny: ["opt1", "opt2"] }    // Array contains any value');
  lines.push('');
  lines.push('// Special operators');
  lines.push('{ exists: true }                     // Property exists');
  lines.push('{ match: "*.test.ts" }               // Glob pattern match');
  lines.push('{ regex: "^TODO:" }                  // Regular expression match');
  lines.push('{ between: [0, 100] }                // Value between two numbers');
  lines.push('```');
  lines.push('');
  
  // Common patterns
  lines.push('## Common Query Patterns', '');
  lines.push('```typescript');
  lines.push('// Find all drafts in posts folder');
  lines.push('vault.select({ \'fs:path\': \'posts/**\', \'fm:status\': \'draft\' });');
  lines.push('');
  lines.push('// Find documents modified after a date');
  lines.push('vault.select({ \'fs:modified\': { gt: \'2024-01-01\' } });');
  lines.push('');
  lines.push('// Find documents with specific tags');
  lines.push('vault.select({ \'fm:tag\': [\'blog\', \'published\'] });');
  lines.push('');
  lines.push('// Search content for text');
  lines.push('vault.select({ \'content:text\': \'TODO\' });');
  lines.push('');
  lines.push('// Complex query with multiple criteria');
  lines.push('vault.select({');
  lines.push('  \'fs:path\': \'projects/**\',');
  lines.push('  \'fm:status\': { ne: \'archived\' },');
  lines.push('  \'fm:priority\': { in: [\'high\', \'urgent\'] },');
  lines.push('  \'content:text\': \'deadline\'');
  lines.push('});');
  lines.push('```');
  
  return lines.join('\n');
}

function getOperatorExample(op) {
  const examples = {
    'gt': '<code>{ gt: "2024-01-01" }</code>',
    'gte': '<code>{ gte: 100 }</code>',
    'lt': '<code>{ lt: "2024-12-31" }</code>',
    'lte': '<code>{ lte: 1000 }</code>',
    'eq': '<code>{ eq: "exact-value" }</code>',
    'ne': '<code>{ ne: "excluded" }</code>',
    'in': '<code>{ in: ["option1", "option2"] }</code>',
    'nin': '<code>{ nin: ["excluded1", "excluded2"] }</code>',
    'exists': '<code>{ exists: true }</code>',
    'contains': '<code>{ contains: "item" }</code>',
    'containsAll': '<code>{ containsAll: ["required1", "required2"] }</code>',
    'containsAny': '<code>{ containsAny: ["option1", "option2"] }</code>',
    'match': '<code>{ match: "*.test.ts" }</code>',
    'regex': '<code>{ regex: "^TODO:" }</code>',
    'between': '<code>{ between: [0, 100] }</code>'
  };
  return examples[op] || `<code>{ ${op}: value }</code>`;
}

/**
 * Extract operations from vault implementation
 */
async function extractOperations() {
  const vaultCode = await readFile('packages/core-operations/src/vault.ts', 'utf-8');
  
  // Manually define operations based on our implementations
  const operations = [
    {
      name: 'select',
      description: 'Select documents matching a query',
      example: "vault.select({ 'fs:path': 'posts/**', 'fm:status': 'draft' })"
    },
    {
      name: 'filter',
      description: 'Filter current selection with a predicate function',
      example: 'ctx.filter(doc => doc.metadata.modified < oneYearAgo)'
    },
    {
      name: 'union',
      description: 'Combine with another selection (OR operation)',
      example: 'drafts.union(recent) // All drafts OR recent documents'
    },
    {
      name: 'intersect',
      description: 'Find documents in both selections (AND operation)',
      example: 'posts.intersect(drafts) // Documents that are posts AND drafts'
    },
    {
      name: 'difference',
      description: 'Remove documents in other selection (set difference)',
      example: 'all.difference(archived) // All documents EXCEPT archived'
    }
  ];
  
  return operations;
}

/**
 * Main function
 */
async function main() {
  console.log('Extracting query syntax from code...\n');
  
  try {
    const data = await extractQuerySyntax();
    const operations = await extractOperations();
    
    // Add operations section to report
    const report = generateReport(data);
    const lines = report.split('\n');
    
    // Insert operations section before Common Query Patterns
    const insertIndex = lines.findIndex(line => line.startsWith('## Common Query Patterns'));
    
    const operationsSection = [
      '',
      '## Fluent Operations',
      '',
      'Operations can be chained to build complex queries:',
      '',
      '| Operation | Description | Example |',
      '|-----------|-------------|---------|'
    ];
    
    for (const op of operations) {
      if (op.name !== 'constructor') {
        operationsSection.push(`| ${op.name}() | ${op.description} | \`${op.example}\` |`);
      }
    }
    
    operationsSection.push('');
    
    lines.splice(insertIndex, 0, ...operationsSection);
    
    const finalReport = lines.join('\n');
    
    // Save report
    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile('reports/query-syntax.md', finalReport);
    
    console.log('Generated: reports/query-syntax.md');
    console.log('\nQuery Syntax Summary:');
    console.log(`- ${data.namespaces.length} namespaces: ${data.namespaces.join(', ')}`);
    console.log(`- ${Object.keys(data.queryStructure.operators).length} operators`);
    console.log(`- ${operations.filter(op => op.name !== 'constructor').length} operations`);
    console.log(`- ${data.operatorExamples.length} examples extracted`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Add missing import
import { promises as fs } from 'node:fs';

// Run
main().catch(console.error);