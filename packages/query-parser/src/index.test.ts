/**
 * @fileoverview Tests for query parser
 */

import { describe, it, expect } from 'vitest';
import type { QueryInput } from '@mmt/entities';
import { parseQuery } from './index.js';

describe('parseQuery', () => {
  it('should parse query into structured format', () => {
    // GIVEN: A query with namespace:property format
    // WHEN: Parsing the query to extract namespace-based structure
    // THEN: Properties are organized into separate namespace objects
    const input: QueryInput = {
      'fs:path': 'posts/**',
      'fm:status': 'published',
      'content:text': 'important',
    };
    
    // WHEN: Parsing the query
    const structured = parseQuery(input);
    
    // THEN: Properties are organized by namespace
    expect(structured).toEqual({
      filesystem: { path: 'posts/**' },
      frontmatter: { status: 'published' },
      content: { text: 'important' },
    });
  });

  it('should handle sort options', () => {
    // GIVEN: A query with sort options
    // WHEN: Parsing a query that includes sort and order fields
    // THEN: Sort options are structured into a sort object with field and order
    const input: QueryInput = {
      'fs:path': 'posts/**',
      sort: 'modified',
      order: 'desc',
    };
    
    // WHEN: Parsing the query
    const structured = parseQuery(input);
    
    // THEN: Sort options are structured correctly
    expect(structured).toEqual({
      filesystem: { path: 'posts/**' },
      sort: { field: 'modified', order: 'desc' },
    });
  });

  it('should skip invalid keys without namespace', () => {
    // GIVEN: A query with invalid keys
    // WHEN: Parsing a query containing keys without namespace prefixes
    // THEN: Invalid keys are ignored (namespace requirement enforced)
    const input: QueryInput = {
      'fs:path': 'posts/**',
      invalidKey: 'value', // No namespace
    };
    
    // WHEN: Parsing the query
    const structured = parseQuery(input);
    
    // THEN: Invalid keys are ignored
    expect(structured).toEqual({
      filesystem: { path: 'posts/**' },
    });
  });

  it('should handle all namespaces', () => {
    // GIVEN: A query using all namespaces
    // WHEN: Parsing a query with fs:, fm:, content:, and inline: prefixes
    // THEN: All namespaces are parsed into their respective objects
    const input: QueryInput = {
      'fs:path': 'posts/**',
      'fs:name': 'README',
      'fm:status': 'draft',
      'fm:tags': ['blog', 'tech'],
      'content:text': 'TODO',
      'inline:tags': ['#urgent', '#bug'],
    };
    
    // WHEN: Parsing the query
    const structured = parseQuery(input);
    
    // THEN: All namespaces are parsed correctly
    expect(structured).toEqual({
      filesystem: { 
        path: 'posts/**',
        name: 'README',
      },
      frontmatter: { 
        status: 'draft',
        tags: ['blog', 'tech'],
      },
      content: { 
        text: 'TODO',
      },
      inline: { 
        tags: ['#urgent', '#bug'],
      },
    });
  });
});