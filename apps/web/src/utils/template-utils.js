/**
 * Expand template variables in a string
 * Supports: {name}, {date}, {timestamp}, {counter}
 * 
 * @param {string} template - The template string
 * @param {string} documentName - The document name to use for {name}
 * @returns {string} The expanded template
 */
export function expandTemplate(template, documentName = 'document') {
  if (!template) return '';
  
  const now = new Date();
  const timestamp = now.toISOString(); // e.g., "2025-07-28T15:30:45.123Z"
  
  return template
    .replace(/\{name\}/g, documentName)
    .replace(/\{date\}/g, now.toISOString().split('T')[0])
    .replace(/\{timestamp\}/g, timestamp)
    .replace(/\{counter\}/g, '1');
}

/**
 * Get list of available template variables
 * @returns {string[]} Array of variable names
 */
export function getTemplateVariables() {
  return ['{name}', '{date}', '{timestamp}', '{counter}'];
}