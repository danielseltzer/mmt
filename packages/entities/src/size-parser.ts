/**
 * Natural language size parser for filter expressions.
 * Converts human-friendly size expressions into SizeFilter objects.
 */

import { SizeFilter } from './filter-criteria.js';

/**
 * Parse natural language size expressions into SizeFilter objects
 * @param input Natural language size expression
 * @returns SizeFilter object or null if unable to parse
 */
export function parseSizeExpression(input: string): SizeFilter | null {
  const normalized = input.trim().toLowerCase();
  
  // Handle empty input
  if (!normalized) {return null;}
  
  // Check for explicit operator syntax first (e.g., "> 10mb", "<= 1.5k")
  const operatorMatch = /^(<=?|>=?|=)\s*(.+)$/.exec(normalized);
  if (operatorMatch) {
    const operator = operatorMatch[1] as '<' | '>' | '<=' | '>=' | '=';
    const sizeStr = operatorMatch[2];
    const sizeInBytes = parseSize(sizeStr);
    
    if (sizeInBytes !== null) {
      return { operator, value: sizeInBytes.toString() };
    }
  }
  
  // Pattern for "under/over X" or "less than/greater than X"
  const comparisonMatch = /^(?:(under|over|less\s+than|greater\s+than|larger\s+than|smaller\s+than|at\s+least|at\s+most))\s+(.+)$/.exec(normalized);
  
  if (comparisonMatch) {
    const comparison = comparisonMatch[1].replace(/\s+/g, ' ');
    const sizeStr = comparisonMatch[2];
    const sizeInBytes = parseSize(sizeStr);
    
    if (sizeInBytes === null) {return null;}
    
    switch (comparison) {
      case 'under':
      case 'less than':
      case 'smaller than':
        return { operator: '<', value: sizeInBytes.toString() };
      case 'over':
      case 'greater than':
      case 'larger than':
        return { operator: '>', value: sizeInBytes.toString() };
      case 'at least':
        return { operator: '>=', value: sizeInBytes.toString() };
      case 'at most':
        return { operator: '<=', value: sizeInBytes.toString() };
    }
  }
  
  // Pattern for "between X and Y"
  const betweenMatch = /^between\s+(.+?)\s+and\s+(.+)$/.exec(normalized);
  if (betweenMatch) {
    const minSize = parseSize(betweenMatch[1]);
    const maxSize = parseSize(betweenMatch[2]);
    
    if (minSize !== null && maxSize !== null) {
      // For now, return the lower bound with >= operator
      // In the future, we might support compound filters
      return { operator: '>=', value: minSize.toString() };
    }
  }
  
  // Try parsing just the size with default operator
  const sizeInBytes = parseSize(normalized);
  if (sizeInBytes !== null) {
    // Default to "at least" for bare size values
    return { operator: '>=', value: sizeInBytes.toString() };
  }
  
  return null;
}

/**
 * Parse a size string into bytes
 * @param sizeStr Size string like "10k", "1.5mb", "2 gigabytes"
 * @returns Size in bytes or null if unable to parse
 */
function parseSize(sizeStr: string): number | null {
  const normalized = sizeStr.trim().toLowerCase();
  
  // Match number with optional decimal and unit
  const match = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/.exec(normalized);
  if (!match) {return null;}
  
  const num = parseFloat(match[1]);
  const unit = match[2];
  
  // Handle empty unit (assume bytes)
  if (!unit) {return num;}
  
  // Map various unit formats to multipliers
  const unitMap: Record<string, number> = {
    // Bytes
    'b': 1,
    'byte': 1,
    'bytes': 1,
    
    // Kilobytes
    'k': 1024,
    'kb': 1024,
    'kilobyte': 1024,
    'kilobytes': 1024,
    
    // Megabytes
    'm': 1024 * 1024,
    'mb': 1024 * 1024,
    'meg': 1024 * 1024,
    'megs': 1024 * 1024,
    'megabyte': 1024 * 1024,
    'megabytes': 1024 * 1024,
    
    // Gigabytes
    'g': 1024 * 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
    'gig': 1024 * 1024 * 1024,
    'gigs': 1024 * 1024 * 1024,
    'gigabyte': 1024 * 1024 * 1024,
    'gigabytes': 1024 * 1024 * 1024,
  };
  
  const multiplier = unitMap[unit];
  if (multiplier === undefined) {return null;}
  
  return Math.floor(num * multiplier);
}

/**
 * Get a human-readable description of what the parsed filter means
 * @param filter The SizeFilter to describe
 * @returns Human-readable description
 */
export function describeSizeFilter(filter: SizeFilter): string {
  const sizeInBytes = parseInt(filter.value);
  const sizeStr = formatBytes(sizeInBytes);
  
  switch (filter.operator) {
    case '>':
      return `larger than ${sizeStr}`;
    case '>=':
      return `at least ${sizeStr}`;
    case '<':
      return `smaller than ${sizeStr}`;
    case '<=':
      return `at most ${sizeStr}`;
    default:
      return `${filter.operator} ${sizeStr}`;
  }
}

/**
 * Format bytes into human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string like "1.5 KB"
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1)) } ${ sizes[i]}`;
}