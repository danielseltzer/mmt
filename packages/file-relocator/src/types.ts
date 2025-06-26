export type LinkType = 'wikilink' | 'markdown';

export interface Link {
  type: LinkType;
  raw: string;      // The full raw link text, e.g., "[[Tasks/task1]]" or "[text](path.md)"
  target: string;   // The path/target being linked to
  line: number;     // Line number where the link appears
  text?: string;    // Link text for markdown links
  anchor?: string;  // Optional anchor/heading reference
}

export interface FileReferences {
  filePath: string;
  links: Link[];
}

export interface RelocatorOptions {
  // Whether to update links in the moved file itself
  updateMovedFile?: boolean;
  // File extensions to process (defaults to ['.md'])
  extensions?: string[];
  // Paths to exclude from processing
  excludePaths?: string[];
}