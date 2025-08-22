/**
 * Parse natural language date expressions into filter conditions
 * 
 * Supports:
 * - Relative: "last 30 days", "past 7 days", "-30d"
 * - Specific: "since 2024", "before 2025", "after 2024-01-01"
 * - Named: "yesterday", "today", "this week", "this month"
 */
export function parseDateExpression(expression) {
  if (!expression) return null;
  
  const expr = expression.toLowerCase().trim();
  const now = new Date();
  
  // Shorthand format: -30d, -7d
  if (expr.match(/^-\d+d$/)) {
    const days = parseInt(expr.substring(1, expr.length - 1));
    const date = new Date();
    date.setDate(date.getDate() - days);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "last N days", "past N days"
  const lastDaysMatch = expr.match(/^(last|past)\s+(\d+)\s+days?$/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[2]);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "yesterday"
  if (expr === 'yesterday') {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    return {
      operator: 'between',
      value: [date.toISOString(), endDate.toISOString()]
    };
  }
  
  // "today"
  if (expr === 'today') {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "this week"
  if (expr === 'this week') {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay()); // Start of week
    date.setHours(0, 0, 0, 0);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "this month"
  if (expr === 'this month') {
    const date = new Date();
    date.setDate(1); // First day of month
    date.setHours(0, 0, 0, 0);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "this year"
  if (expr === 'this year') {
    const date = new Date();
    date.setMonth(0, 1); // January 1st
    date.setHours(0, 0, 0, 0);
    return {
      operator: 'after',
      value: date.toISOString()
    };
  }
  
  // "since YYYY" or "since YYYY-MM" or "since YYYY-MM-DD"
  const sinceMatch = expr.match(/^since\s+(.+)$/);
  if (sinceMatch) {
    const dateStr = sinceMatch[1];
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return {
        operator: 'after',
        value: date.toISOString()
      };
    }
  }
  
  // "before YYYY" or "until YYYY"
  const beforeMatch = expr.match(/^(before|until)\s+(.+)$/);
  if (beforeMatch) {
    const dateStr = beforeMatch[2];
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return {
        operator: 'before',
        value: date.toISOString()
      };
    }
  }
  
  // Direct comparison operators: > < >= <=
  const comparisonMatch = expr.match(/^([<>]=?)\s*(.+)$/);
  if (comparisonMatch) {
    const op = comparisonMatch[1];
    const dateStr = comparisonMatch[2];
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const operatorMap = {
        '>': 'after',
        '>=': 'after',
        '<': 'before',
        '<=': 'before'
      };
      return {
        operator: operatorMap[op],
        value: date.toISOString()
      };
    }
  }
  
  return null;
}

/**
 * Parse natural language size expressions into filter conditions
 * 
 * Supports:
 * - "over 1mb", "greater than 100k"
 * - "under 10k", "less than 5mb"
 * - "at least 1gb", "at most 500k"
 * - Units: b/bytes, k/kb, m/mb, g/gb
 */
export function parseSizeExpression(expression) {
  if (!expression) return null;
  
  const expr = expression.toLowerCase().trim();
  
  // Parse size units
  const parseSize = (sizeStr) => {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([bkmg])?(?:b|bytes?)?$/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'b').toLowerCase();
    
    const multipliers = {
      'b': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };
    
    return value * multipliers[unit];
  };
  
  // "over X", "greater than X", "more than X"
  const overMatch = expr.match(/^(over|greater\s+than|more\s+than)\s+(.+)$/);
  if (overMatch) {
    const size = parseSize(overMatch[2]);
    if (size !== null) {
      return {
        operator: 'greater',
        value: size.toString()
      };
    }
  }
  
  // "under X", "less than X", "smaller than X"
  const underMatch = expr.match(/^(under|less\s+than|smaller\s+than)\s+(.+)$/);
  if (underMatch) {
    const size = parseSize(underMatch[2]);
    if (size !== null) {
      return {
        operator: 'less',
        value: size.toString()
      };
    }
  }
  
  // "at least X", "minimum X"
  const atLeastMatch = expr.match(/^(at\s+least|minimum)\s+(.+)$/);
  if (atLeastMatch) {
    const size = parseSize(atLeastMatch[2]);
    if (size !== null) {
      return {
        operator: 'greaterOrEqual',
        value: size.toString()
      };
    }
  }
  
  // "at most X", "maximum X"
  const atMostMatch = expr.match(/^(at\s+most|maximum)\s+(.+)$/);
  if (atMostMatch) {
    const size = parseSize(atMostMatch[2]);
    if (size !== null) {
      return {
        operator: 'lessOrEqual',
        value: size.toString()
      };
    }
  }
  
  // Direct comparison operators: > < >= <=
  const comparisonMatch = expr.match(/^([<>]=?)\s*(.+)$/);
  if (comparisonMatch) {
    const op = comparisonMatch[1];
    const size = parseSize(comparisonMatch[2]);
    if (size !== null) {
      const operatorMap = {
        '>': 'greater',
        '>=': 'greaterOrEqual',
        '<': 'less',
        '<=': 'lessOrEqual'
      };
      return {
        operator: operatorMap[op],
        value: size.toString()
      };
    }
  }
  
  return null;
}