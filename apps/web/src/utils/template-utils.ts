/**
 * Template utilities for file operations
 * Provides variable expansion for renaming and frontmatter operations
 */

// Available template variables
const TEMPLATE_VARIABLES = [
  '{{name}}',        // Current filename without extension
  '{{ext}}',         // File extension
  '{{date}}',        // Current date (YYYY-MM-DD)
  '{{time}}',        // Current time (HH-MM-SS)
  '{{timestamp}}',   // Unix timestamp
  '{{year}}',        // Current year
  '{{month}}',       // Current month (01-12)
  '{{day}}',         // Current day (01-31)
  '{{folder}}',      // Parent folder name
  '{{path}}',        // Full path without filename
];

/**
 * Get list of available template variables
 */
export function getTemplateVariables(): string[] {
  return TEMPLATE_VARIABLES;
}

/**
 * Expand template string with actual values
 * @param template - Template string with {{variables}}
 * @param filename - Filename to use for name-based variables
 * @returns Expanded string with variables replaced
 */
export function expandTemplate(template: string, filename: string): string {
  if (!template) return '';
  
  // Extract name and extension from filename
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot + 1) : '';
  
  // Get current date/time values
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  // Get folder from full path if available
  const fullPath = filename.includes('/') ? filename : `/vault/${filename}`;
  const pathParts = fullPath.split('/');
  const folder = pathParts[pathParts.length - 2] || 'root';
  const path = pathParts.slice(0, -1).join('/');
  
  // Replace all variables
  let result = template;
  result = result.replace(/\{\{name\}\}/g, name);
  result = result.replace(/\{\{ext\}\}/g, ext);
  result = result.replace(/\{\{date\}\}/g, `${year}-${month}-${day}`);
  result = result.replace(/\{\{time\}\}/g, `${hours}-${minutes}-${seconds}`);
  result = result.replace(/\{\{timestamp\}\}/g, now.getTime().toString());
  result = result.replace(/\{\{year\}\}/g, year);
  result = result.replace(/\{\{month\}\}/g, month);
  result = result.replace(/\{\{day\}\}/g, day);
  result = result.replace(/\{\{folder\}\}/g, folder);
  result = result.replace(/\{\{path\}\}/g, path);
  
  return result;
}