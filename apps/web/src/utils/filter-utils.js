/**
 * Parse natural language date expressions into filter operators
 */
export function parseDateExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim().toLowerCase();
  
  // Pattern: "last X days/weeks/months/years"
  const lastMatch = trimmed.match(/^last\s+(\d+)\s+(days?|weeks?|months?|years?)$/);
  if (lastMatch) {
    const [, amount, unit] = lastMatch;
    const unitChar = unit.charAt(0); // d, w, m, y
    return { operator: 'gt', value: `-${amount}${unitChar}` };
  }
  
  // Pattern: "< X days/weeks/months/years"
  const ltMatch = trimmed.match(/^<\s*(\d+)\s*(days?|weeks?|months?|years?)$/);
  if (ltMatch) {
    const [, amount, unit] = ltMatch;
    const unitChar = unit.charAt(0);
    return { operator: 'gt', value: `-${amount}${unitChar}` };
  }
  
  // Pattern: "> YYYY-MM-DD" or ">= YYYY-MM-DD"
  const dateCompareMatch = trimmed.match(/^(>|>=|<|<=)\s*(\d{4}(?:-\d{2}){0,2})$/);
  if (dateCompareMatch) {
    const [, op, date] = dateCompareMatch;
    const operatorMap = {
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte'
    };
    return { operator: operatorMap[op], value: date };
  }
  
  // Pattern: "since YYYY"
  const sinceMatch = trimmed.match(/^since\s+(\d{4})$/);
  if (sinceMatch) {
    const [, year] = sinceMatch;
    return { operator: 'gte', value: year };
  }
  
  return null;
}

/**
 * Parse natural language size expressions into filter operators
 */
export function parseSizeExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim().toLowerCase();
  
  // Size unit multipliers
  const units = {
    'b': 1,
    'k': 1024,
    'kb': 1024,
    'm': 1048576,
    'mb': 1048576,
    'g': 1073741824,
    'gb': 1073741824
  };
  
  // Pattern: "over X[unit]" or "under X[unit]"
  const overUnderMatch = trimmed.match(/^(over|under)\s+(\d+(?:\.\d+)?)\s*([kmg]b?)?$/);
  if (overUnderMatch) {
    const [, direction, amount, unit = 'b'] = overUnderMatch;
    const multiplier = units[unit] || 1;
    const bytes = Math.floor(parseFloat(amount) * multiplier);
    return {
      operator: direction === 'over' ? 'gt' : 'lt',
      value: bytes.toString()
    };
  }
  
  // Pattern: "> X[unit]" or "< X[unit]" etc
  const operatorMatch = trimmed.match(/^(>|>=|<|<=)\s*(\d+(?:\.\d+)?)\s*([kmg]b?)?$/);
  if (operatorMatch) {
    const [, op, amount, unit = 'b'] = operatorMatch;
    const multiplier = units[unit] || 1;
    const bytes = Math.floor(parseFloat(amount) * multiplier);
    const operatorMap = {
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte'
    };
    return {
      operator: operatorMap[op],
      value: bytes.toString()
    };
  }
  
  return null;
}