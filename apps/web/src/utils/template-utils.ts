/**
 * Get list of available template variables
 */
export function getTemplateVariables(): string[] {
  return [
    '{{name}}',      // Current filename without extension
    '{{date}}',      // Current date (YYYY-MM-DD)
    '{{time}}',      // Current time (HH:MM:SS)
    '{{timestamp}}', // Unix timestamp
    '{{year}}',      // Current year
    '{{month}}',     // Current month (01-12)
    '{{day}}'        // Current day (01-31)
  ];
}

/**
 * Expand template variables with actual values
 * @param template - Template string with variables
 * @param fileName - Current file name (for {{name}} variable)
 * @returns Expanded template
 */
export function expandTemplate(template: string, fileName: string = ''): string {
  if (!template || typeof template !== 'string') {
    return template || '';
  }
  
  const now = new Date();
  
  // Extract name without extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Format helpers
  const pad = (num: number): string => String(num).padStart(2, '0');
  
  // Variable replacements
  const replacements: Record<string, string> = {
    '{{name}}': nameWithoutExt,
    '{{date}}': `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    '{{time}}': `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    '{{timestamp}}': Math.floor(now.getTime() / 1000).toString(),
    '{{year}}': now.getFullYear().toString(),
    '{{month}}': pad(now.getMonth() + 1),
    '{{day}}': pad(now.getDate())
  };
  
  let result = template;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return result;
}