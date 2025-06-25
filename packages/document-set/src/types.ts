/**
 * Type definitions for document-set package
 */

/**
 * Row structure returned from Arquero tables containing document data
 */
export interface DocumentRow {
  path: string;
  name: string;
  modified: string | Date;
  size: number;
  tags: string | string[];
  tags_count: number;
  links?: string | string[];
  backlinks?: string | string[];
  // Frontmatter fields with fm_ prefix
  [key: `fm_${string}`]: unknown;
}

/**
 * Parsed array field value
 */
export type ParsedArrayField = string | string[] | undefined;