/**
 * Parse natural language date expressions into filter operators
 */
export function parseDateExpression(expression: string): { operator: string; value: string } | null {
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
    const operatorMap: Record<string, string> = {
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
export function parseSizeExpression(expression: string): { operator: string; value: string } | null {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim().toLowerCase();
  
  // Pattern: "over X" or "under X" with units
  const overUnderMatch = trimmed.match(/^(over|under)\s+(\d+(?:\.\d+)?)\s*([kmgt]b?)?$/);
  if (overUnderMatch) {
    const [, direction, amount, unit = 'b'] = overUnderMatch;
    const operator = direction === 'over' ? 'gt' : 'lt';
    const multipliers: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'kb': 1024,
      'm': 1024 * 1024,
      'mb': 1024 * 1024,
      'g': 1024 * 1024 * 1024,
      'gb': 1024 * 1024 * 1024,
      't': 1024 * 1024 * 1024 * 1024,
      'tb': 1024 * 1024 * 1024 * 1024
    };
    const bytes = parseFloat(amount) * (multipliers[unit.toLowerCase()] || 1);
    return { operator, value: bytes.toString() };
  }
  
  // Pattern: operator expressions like "> 100k" or "<= 500mb"
  const operatorMatch = trimmed.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)\s*([kmgt]b?)?$/);
  if (operatorMatch) {
    const [, op, amount, unit = 'b'] = operatorMatch;
    const operatorMap: Record<string, string> = {
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte'
    };
    const multipliers: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'kb': 1024,
      'm': 1024 * 1024,
      'mb': 1024 * 1024,
      'g': 1024 * 1024 * 1024,
      'gb': 1024 * 1024 * 1024,
      't': 1024 * 1024 * 1024 * 1024,
      'tb': 1024 * 1024 * 1024 * 1024
    };
    const bytes = parseFloat(amount) * (multipliers[unit.toLowerCase()] || 1);
    return { operator: operatorMap[op], value: bytes.toString() };
  }
  
  // Pattern: "at least X" or "at most X"
  const atMatch = trimmed.match(/^at\s+(least|most)\s+(\d+(?:\.\d+)?)\s*([kmgt]b?)?$/);
  if (atMatch) {
    const [, bound, amount, unit = 'b'] = atMatch;
    const operator = bound === 'least' ? 'gte' : 'lte';
    const multipliers: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'kb': 1024,
      'm': 1024 * 1024,
      'mb': 1024 * 1024,
      'g': 1024 * 1024 * 1024,
      'gb': 1024 * 1024 * 1024,
      't': 1024 * 1024 * 1024 * 1024,
      'tb': 1024 * 1024 * 1024 * 1024
    };
    const bytes = parseFloat(amount) * (multipliers[unit.toLowerCase()] || 1);
    return { operator, value: bytes.toString() };
  }
  
  return null;
}