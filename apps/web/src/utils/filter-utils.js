/**
 * Parse natural language date expressions into filter format
 * Examples: "last 30 days", "< 7 days", "> 2024-01-01"
 */
export function parseDateExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return null;
  }
  
  const trimmed = expression.trim().toLowerCase();
  
  // Handle relative expressions like "last 30 days", "past 7 days"
  const lastMatch = trimmed.match(/^(last|past)\s+(\d+)\s+days?$/);
  if (lastMatch) {
    const days = parseInt(lastMatch[2]);
    return { operator: 'gt', value: `-${days}d` };
  }
  
  // Handle operator expressions like "< 7 days", "> 30 days"
  const operatorMatch = trimmed.match(/^([<>]=?)\s*(\d+)\s*days?$/);
  if (operatorMatch) {
    const operator = operatorMatch[1];
    const days = parseInt(operatorMatch[2]);
    const opMap = {
      '<': 'gt',
      '<=': 'gte',
      '>': 'lt',
      '>=': 'lte'
    };
    return { operator: opMap[operator] || 'gt', value: `-${days}d` };
  }
  
  // Handle date comparisons like "> 2024-01-01"
  const dateMatch = trimmed.match(/^([<>]=?)\s*(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    const operator = dateMatch[1];
    const date = dateMatch[2];
    const opMap = {
      '<': 'lt',
      '<=': 'lte',
      '>': 'gt',
      '>=': 'gte'
    };
    return { operator: opMap[operator] || 'gt', value: date };
  }
  
  // Handle "since" expressions
  if (trimmed.startsWith('since ')) {
    const dateStr = trimmed.substring(6);
    return { operator: 'gte', value: dateStr };
  }
  
  return null;
}

/**
 * Parse natural language size expressions into filter format
 * Examples: "over 1mb", "under 10k", "> 100k"
 */
export function parseSizeExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return null;
  }
  
  const trimmed = expression.trim().toLowerCase();
  
  // Parse size units
  const parseSize = (sizeStr) => {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([kmgb]?)b?$/i);
    if (!match) return null;
    
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    const multipliers = {
      '': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };
    
    return Math.floor(num * (multipliers[unit] || 1));
  };
  
  // Handle "over/under" expressions
  const overUnderMatch = trimmed.match(/^(over|under|greater than|less than|at least|at most)\s+(.+)$/);
  if (overUnderMatch) {
    const qualifier = overUnderMatch[1];
    const sizeStr = overUnderMatch[2];
    const size = parseSize(sizeStr);
    
    if (size === null) return null;
    
    const opMap = {
      'over': 'gt',
      'greater than': 'gt',
      'under': 'lt',
      'less than': 'lt',
      'at least': 'gte',
      'at most': 'lte'
    };
    
    return { operator: opMap[qualifier] || 'gt', value: size.toString() };
  }
  
  // Handle operator expressions like "> 1mb", "<= 500k"
  const operatorMatch = trimmed.match(/^([<>]=?)\s*(.+)$/);
  if (operatorMatch) {
    const operator = operatorMatch[1];
    const sizeStr = operatorMatch[2];
    const size = parseSize(sizeStr);
    
    if (size === null) return null;
    
    const opMap = {
      '<': 'lt',
      '<=': 'lte',
      '>': 'gt',
      '>=': 'gte'
    };
    
    return { operator: opMap[operator] || 'gt', value: size.toString() };
  }
  
  return null;
}