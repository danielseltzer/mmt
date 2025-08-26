/**
 * Template utility functions for the TransformPanel component
 */

export function expandTemplate(template, context) {
  if (!template || !context) return template;
  
  // Replace template variables with context values
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] !== undefined ? context[key] : match;
  });
}

export function getTemplateVariables(template) {
  if (!template) return [];
  
  const variables = [];
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

export function validateTemplate(template) {
  if (!template) return { valid: false, error: 'Template is required' };
  
  // Check for balanced braces
  let openCount = 0;
  let closeCount = 0;
  
  for (let i = 0; i < template.length; i++) {
    if (template[i] === '{' && template[i + 1] === '{') {
      openCount++;
      i++; // Skip next character
    } else if (template[i] === '}' && template[i + 1] === '}') {
      closeCount++;
      i++; // Skip next character
    }
  }
  
  if (openCount !== closeCount) {
    return { valid: false, error: 'Unbalanced template braces' };
  }
  
  // Check for valid variable names
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!/^[a-zA-Z_]\w*$/.test(match[1])) {
      return { valid: false, error: `Invalid variable name: ${match[1]}` };
    }
  }
  
  return { valid: true };
}

export function getAvailableVariables() {
  // Return list of available template variables
  return [
    { name: 'name', description: 'File name without extension' },
    { name: 'path', description: 'Full file path' },
    { name: 'folder', description: 'Parent folder name' },
    { name: 'date', description: 'Current date (YYYY-MM-DD)' },
    { name: 'time', description: 'Current time (HH:MM)' },
    { name: 'timestamp', description: 'Unix timestamp' },
    { name: 'year', description: 'Current year' },
    { name: 'month', description: 'Current month (01-12)' },
    { name: 'day', description: 'Current day (01-31)' }
  ];
}