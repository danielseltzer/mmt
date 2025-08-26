/**
 * Filter utility functions for the FilterBar component
 */

export function parseFilterValue(value, type) {
  if (!value) return null;
  
  switch (type) {
    case 'number':
      return parseInt(value, 10);
    case 'boolean':
      return value === 'true';
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

export function formatFilterDisplay(filter) {
  const { field, operator, value } = filter;
  const operatorSymbols = {
    eq: '=',
    ne: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: '~',
    startsWith: '^',
    endsWith: '$'
  };
  
  return `${field} ${operatorSymbols[operator] || operator} ${value}`;
}

export function isValidFilter(filter) {
  return filter && 
         filter.field && 
         filter.operator && 
         filter.value !== undefined && 
         filter.value !== '';
}

export function getFieldType(field) {
  // Map field names to their types
  const fieldTypes = {
    size: 'number',
    modified: 'date',
    created: 'date',
    tags_count: 'number',
    links_count: 'number',
    backlinks_count: 'number',
    fm_draft: 'boolean',
    fm_published: 'boolean'
  };
  
  return fieldTypes[field] || 'string';
}

export function parseDateExpression(expression) {
  if (!expression) return null;
  
  const now = new Date();
  const match = expression.match(/^(\d+)([dwmy])$/);
  
  if (!match) {
    // Try to parse as ISO date
    const date = new Date(expression);
    return isNaN(date) ? null : date;
  }
  
  const [, amount, unit] = match;
  const value = parseInt(amount, 10);
  
  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    case 'w':
      now.setDate(now.getDate() - value * 7);
      break;
    case 'm':
      now.setMonth(now.getMonth() - value);
      break;
    case 'y':
      now.setFullYear(now.getFullYear() - value);
      break;
  }
  
  return now;
}

export function parseSizeExpression(expression) {
  if (!expression) return null;
  
  const match = expression.match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)?$/i);
  if (!match) return null;
  
  const [, amount, unit = 'b'] = match;
  const value = parseFloat(amount);
  
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const multiplier = multipliers[unit.toLowerCase()] || 1;
  return value * multiplier;
}