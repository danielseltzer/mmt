import type { Document } from './types';

/**
 * Extract relative path from full path for display
 */
export function getRelativePath(fullPath: string): string {
  let relativePath = fullPath
    .replace(/^\/Users\/danielseltzer\/Notes\/Personal-sync-250710/, '')
    .replace(/^\/Users\/[^/]+\/[^/]+\/[^/]+\/test-vault/, '')
    .replace(/^.*\/test-vault/, '')
    .replace(/^.*\/vault/, '');
  
  // Ensure leading slash
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  
  return relativePath;
}

/**
 * Format date for display
 */
export function formatDate(value: string | Date | null | undefined): string {
  let date: Date | null = null;
  
  // Handle string dates (from API) and Date objects
  if (typeof value === 'string') {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  }
  
  if (!date || isNaN(date.getTime())) {
    return '-';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(sizeInBytes: number): string {
  return `${(sizeInBytes / 1024).toFixed(1)}K`;
}

/**
 * Compare dates for sorting
 * Invalid/missing dates are treated as very old (sorted to end when descending)
 */
export function compareDates(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  // Convert to dates
  let dateA: Date | null = null;
  let dateB: Date | null = null;
  
  if (typeof a === 'string') dateA = new Date(a);
  else if (a instanceof Date) dateA = a;
  
  if (typeof b === 'string') dateB = new Date(b);
  else if (b instanceof Date) dateB = b;
  
  // Get timestamps, treating invalid/missing as very old date (0)
  let aTime = 0;
  let bTime = 0;
  
  if (dateA && !isNaN(dateA.getTime())) {
    aTime = dateA.getTime();
  }
  
  if (dateB && !isNaN(dateB.getTime())) {
    bTime = dateB.getTime();
  }
  
  return aTime - bTime;
}

/**
 * Get document ID for unique identification
 */
export function getDocumentId(doc: Document): string {
  return doc.fullPath || doc.path;
}

/**
 * Build Obsidian URI for opening document
 */
export function buildObsidianUri(doc: Document): string {
  const vaultName = 'Personal-sync';
  const fullPath = doc.fullPath || doc.path;
  
  // Extract the path relative to the vault
  let filePath = fullPath;
  
  // Remove everything up to and including "Personal-sync/"
  const vaultMarker = '/Personal-sync/';
  const vaultIndex = filePath.indexOf(vaultMarker);
  if (vaultIndex !== -1) {
    filePath = '/' + filePath.substring(vaultIndex + vaultMarker.length);
  } else if (filePath.includes('/Notes/')) {
    // Fallback: remove up to /Notes/
    filePath = filePath.substring(filePath.indexOf('/Notes/') + 7);
    // Remove Personal-sync/ if it's at the beginning
    if (filePath.startsWith('Personal-sync/')) {
      filePath = '/' + filePath.substring('Personal-sync/'.length);
    }
  }
  
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
}

/**
 * Extract metadata display info from frontmatter
 */
export function getMetadataDisplay(frontmatter: Record<string, any> | undefined, tags: string[] = []): {
  propertyNames: string[];
  tooltipText: string;
} {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return {
      propertyNames: [],
      tooltipText: tags.length > 0 ? tags.join(', ') : ''
    };
  }
  
  // Show just the property names
  const propertyNames = Object.keys(frontmatter)
    .filter(key => {
      const value = frontmatter[key];
      // Skip complex values, nulls, and empty arrays
      return value !== null && value !== undefined && 
             !(Array.isArray(value) && value.length === 0);
    });
  
  const tooltipText = propertyNames.map(key => {
    const value = frontmatter[key];
    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.join(', ');
    } else if (typeof value === 'object' && value !== null) {
      displayValue = JSON.stringify(value);
    }
    return `${key}: ${displayValue}`;
  }).join('\n');
  
  return { propertyNames, tooltipText };
}