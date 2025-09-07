export function parseDateExpression(expression: string): { operator: string; value: string } | null {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim().toLowerCase();
  
  // Handle "last X days" format
  const lastDaysMatch = trimmed.match(/^last\s+(\d+)\s+days?$/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1]);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return {
      operator: '>',
      value: date.toISOString()
    };
  }

  // Handle "< X days" or "> X days" format
  const operatorDaysMatch = trimmed.match(/^([<>]=?)\s*(\d+)\s+days?$/);
  if (operatorDaysMatch) {
    const days = parseInt(operatorDaysMatch[2]);
    const date = new Date();
    date.setDate(date.getDate() - days);
    // Invert < to > because "< 7 days" means "modified after 7 days ago"
    const operator = operatorDaysMatch[1].startsWith('<') ? '>' : '<';
    return {
      operator,
      value: date.toISOString()
    };
  }

  // Handle date comparisons like "> 2024-01-01"
  const dateComparisonMatch = trimmed.match(/^([<>]=?)\s*(\d{4}-\d{2}-\d{2})$/);
  if (dateComparisonMatch) {
    const operator = dateComparisonMatch[1];
    const dateStr = dateComparisonMatch[2];
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return {
      operator,
      value: date.toISOString()
    };
  }

  // Handle "since YYYY" format
  const sinceYearMatch = trimmed.match(/^since\s+(\d{4})$/);
  if (sinceYearMatch) {
    const year = sinceYearMatch[1];
    const date = new Date(`${year}-01-01T00:00:00.000Z`);
    return {
      operator: '>=',
      value: date.toISOString()
    };
  }

  return null;
}

export function parseSizeExpression(expression: string): { operator: string; value: string } | null {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmed = expression.trim().toLowerCase();
  
  // Size unit multipliers
  const units: Record<string, number> = {
    'k': 1024,
    'kb': 1024,
    'm': 1024 * 1024,
    'mb': 1024 * 1024,
    'g': 1024 * 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  // Handle "over X" or "under X" format
  const overUnderMatch = trimmed.match(/^(over|under|at\s+least|at\s+most)\s+(\d+(?:\.\d+)?)\s*([kmg]b?)?$/);
  if (overUnderMatch) {
    const keyword = overUnderMatch[1];
    const value = parseFloat(overUnderMatch[2]);
    const unit = overUnderMatch[3] || 'b';
    
    let operator = '>';
    if (keyword === 'under' || keyword === 'at most') {
      operator = '<';
    } else if (keyword === 'at least') {
      operator = '>=';
    }
    
    const multiplier = units[unit] || 1;
    const bytes = Math.floor(value * multiplier);
    
    return {
      operator,
      value: bytes.toString()
    };
  }

  // Handle operator expressions like "> 100k" or "<= 500k"
  const operatorMatch = trimmed.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)\s*([kmg]b?)?$/);
  if (operatorMatch) {
    const operator = operatorMatch[1];
    const value = parseFloat(operatorMatch[2]);
    const unit = operatorMatch[3] || 'b';
    
    const multiplier = units[unit] || 1;
    const bytes = Math.floor(value * multiplier);
    
    return {
      operator,
      value: bytes.toString()
    };
  }

  return null;
}