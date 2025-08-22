/**
 * Template utilities for document transformation
 */

/**
 * Extract template variables from a template string
 * Looks for {{variable}} patterns
 * 
 * @param {string} template - Template string to analyze
 * @returns {string[]} Array of unique variable names found in template
 */
export function getTemplateVariables(template) {
  if (!template) return [];
  
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  const variables = matches.map(match => match.replace(/[{}]/g, '').trim());
  return [...new Set(variables)]; // Return unique variables
}

/**
 * Expand a template with provided values
 * Replaces {{variable}} with corresponding values
 * 
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Record<string, any>} values - Object mapping variable names to values
 * @returns {string} Expanded template with variables replaced
 */
export function expandTemplate(template, values) {
  if (!template) return '';
  if (!values) return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const varName = variable.trim();
    
    // Handle nested properties like {{metadata.title}}
    const parts = varName.split('.');
    let value = values;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Variable not found, return original placeholder
        return match;
      }
    }
    
    // Convert value to string for template expansion
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  });
}

/**
 * Validate a template string
 * Checks for balanced braces and valid variable names
 * 
 * @param {string} template - Template string to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateTemplate(template) {
  if (!template) {
    return { valid: true };
  }
  
  // Check for balanced braces
  let braceCount = 0;
  for (let i = 0; i < template.length; i++) {
    if (template[i] === '{' && template[i + 1] === '{') {
      braceCount++;
      i++; // Skip next brace
    } else if (template[i] === '}' && template[i + 1] === '}') {
      braceCount--;
      i++; // Skip next brace
      if (braceCount < 0) {
        return { 
          valid: false, 
          error: 'Unmatched closing braces }}' 
        };
      }
    }
  }
  
  if (braceCount !== 0) {
    return { 
      valid: false, 
      error: 'Unmatched opening braces {{' 
    };
  }
  
  // Check for valid variable names
  const variables = getTemplateVariables(template);
  for (const variable of variables) {
    // Variable names should only contain letters, numbers, dots, underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(variable)) {
      return {
        valid: false,
        error: `Invalid variable name: ${variable}`
      };
    }
  }
  
  return { valid: true };
}