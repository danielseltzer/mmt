/**
 * Natural language date parser for filter expressions.
 * Converts human-friendly date expressions into DateFilter objects.
 */

import { DateFilter } from './filter-criteria.js';

/**
 * Parse natural language date expressions into DateFilter objects
 * @param input Natural language date expression
 * @returns DateFilter object or null if unable to parse
 */
export function parseDateExpression(input: string): DateFilter | null {
  const normalized = input.trim().toLowerCase();
  
  // Handle empty input
  if (!normalized) {return null;}
  
  // Check for explicit operator syntax first (e.g., "> 2024-01-01", "<= yesterday")
  // But NOT for shorthand units like "7d", "3m", "2w", "1y"
  const operatorMatch = /^(<=?|>=?|=)\s+(.+)$/u.exec(normalized);
  if (operatorMatch && !(/^\d+(d|w|m|y)$/u.exec(operatorMatch[2]))) {
    const operator = operatorMatch[1] as '<' | '>' | '<=' | '>=' | '=';
    const [, , dateExpr] = operatorMatch;
    
    // Try to parse the date expression recursively (for things like ">= yesterday")
    const innerResult = parseDateExpression(dateExpr);
    if (innerResult) {
      return { operator, value: innerResult.value };
    }
    
    // Try standard date parsing
    const parsedDate = new Date(dateExpr);
    if (!isNaN(parsedDate.getTime())) {
      return { operator, value: parsedDate.toISOString() };
    }
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Relative past patterns
  const lastXDaysMatch = /^(?:last|past)\s+(\d+)\s+days?$/u.exec(normalized);
  if (lastXDaysMatch) {
    const [, daysStr] = lastXDaysMatch;
    const days = parseInt(daysStr, 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return { operator: '>', value: date.toISOString() };
  }
  
  // Pattern for operator with shorthand units (e.g., "<7d", ">3m", "<=2w")
  // When using operator notation, the operator is literal (< means less than)
  const operatorShorthandMatch = /^(<=?|>=?)\s*(\d+)(d|w|m|y)$/u.exec(normalized);
  if (operatorShorthandMatch) {
    const operator = operatorShorthandMatch[1] as '<' | '>' | '<=' | '>=';
    const [, , amountStr, unit] = operatorShorthandMatch;
    const amount = parseInt(amountStr, 10);
    const date = new Date();
    
    // Calculate the target date
    if (unit === 'd') {
      date.setDate(date.getDate() - amount);
    } else if (unit === 'w') {
      date.setDate(date.getDate() - (amount * 7));
    } else if (unit === 'm') {
      date.setMonth(date.getMonth() - amount);
    } else if (unit === 'y') {
      date.setFullYear(date.getFullYear() - amount);
    }
    
    // When user types "< 7d", they mean "files modified less than 7 days ago" (recent files)
    // This requires operator '>' to filter files newer than 7 days ago
    // When user types "> 7d", they mean "files modified more than 7 days ago" (older files)
    // This requires operator '<' to filter files older than 7 days ago
    // So we need to invert the operators
    const invertedOperator = operator === '<' ? '>' : 
                            operator === '<=' ? '>=' :
                            operator === '>' ? '<' : '<=';
    return { operator: invertedOperator, value: date.toISOString() };
  }
  
  // Pattern for "< N days/weeks/months/years" (modified less than N time ago = within last N time)
  const lessThanTimeMatch = /^<\s+(\d+)\s*(days?|weeks?|months?|years?)$/u.exec(normalized);
  if (lessThanTimeMatch) {
    const [, amountStr, unit] = lessThanTimeMatch;
    const amount = parseInt(amountStr, 10);
    const date = new Date();
    
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() - amount);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() - (amount * 7));
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() - amount);
    } else if (unit.startsWith('year')) {
      date.setFullYear(date.getFullYear() - amount);
    }
    
    return { operator: '>', value: date.toISOString() };
  }
  
  // Pattern for "> N days/weeks/months/years" (modified more than N time ago)
  const moreThanTimeMatch = /^>\s+(\d+)\s*(days?|weeks?|months?|years?)$/u.exec(normalized);
  if (moreThanTimeMatch) {
    const [, amountStr, unit] = moreThanTimeMatch;
    const amount = parseInt(amountStr, 10);
    const date = new Date();
    
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() - amount);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() - (amount * 7));
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() - amount);
    } else if (unit.startsWith('year')) {
      date.setFullYear(date.getFullYear() - amount);
    }
    
    return { operator: '<', value: date.toISOString() };
  }
  
  // Yesterday
  if (normalized === 'yesterday') {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return { operator: '>', value: date.toISOString() };
  }
  
  // Last/past week
  if (normalized === 'last week' || normalized === 'past week') {
    const date = new Date(today);
    date.setDate(date.getDate() - 7);
    return { operator: '>', value: date.toISOString() };
  }
  
  // Last/past month
  if (normalized === 'last month' || normalized === 'past month') {
    const date = new Date(today);
    date.setMonth(date.getMonth() - 1);
    return { operator: '>', value: date.toISOString() };
  }
  
  // Last/past year
  if (normalized === 'last year' || normalized === 'past year') {
    const date = new Date(today);
    date.setFullYear(date.getFullYear() - 1);
    return { operator: '>', value: date.toISOString() };
  }
  
  // This week/month/year
  if (normalized === 'this week') {
    const date = new Date(today);
    date.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    return { operator: '>=', value: date.toISOString() };
  }
  
  if (normalized === 'this month') {
    const date = new Date(today.getFullYear(), today.getMonth(), 1);
    return { operator: '>=', value: date.toISOString() };
  }
  
  if (normalized === 'this year') {
    const date = new Date(today.getFullYear(), 0, 1);
    return { operator: '>=', value: date.toISOString() };
  }
  
  // Today
  if (normalized === 'today') {
    return { operator: '>=', value: today.toISOString() };
  }
  
  // Since patterns
  const sinceMatch = /^(?:since|after)\s+(.+)$/u.exec(normalized);
  if (sinceMatch) {
    const [, dateStr] = sinceMatch;
    
    // Try parsing as year
    const yearMatch = /^(\d{4})$/u.exec(dateStr);
    if (yearMatch) {
      // Use UTC to avoid timezone issues
      const [, yearStr] = yearMatch;
      const date = new Date(Date.UTC(parseInt(yearStr, 10), 0, 1));
      return { operator: '>=', value: date.toISOString() };
    }
    
    // Try parsing as month name
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.findIndex(m => dateStr.includes(m));
    if (monthIndex !== -1) {
      // Check if year is included
      const yearInMonthMatch = /(\d{4})/u.exec(dateStr);
      const year = yearInMonthMatch ? parseInt(yearInMonthMatch[1], 10) : today.getFullYear();
      const date = new Date(Date.UTC(year, monthIndex, 1));
      return { operator: '>=', value: date.toISOString() };
    }
    
    // Try standard date parsing
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return { operator: '>=', value: parsedDate.toISOString() };
    }
  }
  
  // Before patterns
  const beforeMatch = /^(?:before|until)\s+(.+)$/u.exec(normalized);
  if (beforeMatch) {
    const [, dateStr] = beforeMatch;
    
    // Try parsing as year
    const yearMatch = /^(\d{4})$/u.exec(dateStr);
    if (yearMatch) {
      const [, yearStr] = yearMatch;
      const date = new Date(Date.UTC(parseInt(yearStr, 10), 0, 1));
      return { operator: '<', value: date.toISOString() };
    }
    
    // Try parsing as month
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.findIndex(m => dateStr.includes(m));
    if (monthIndex !== -1) {
      const yearInMonthMatch = /(\d{4})/u.exec(dateStr);
      const year = yearInMonthMatch ? parseInt(yearInMonthMatch[1], 10) : today.getFullYear();
      const date = new Date(Date.UTC(year, monthIndex, 1));
      return { operator: '<', value: date.toISOString() };
    }
    
    // Try standard date parsing
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return { operator: '<', value: parsedDate.toISOString() };
    }
  }
  
  // Shorthand relative dates (e.g., "-30d", "+7d", "2w", "3m", "1y")
  const relativeMatch = /^([+-]?)(\d+)(d|w|m|y)$/u.exec(normalized);
  if (relativeMatch) {
    const [, signMatch, amountStr, unit] = relativeMatch;
    const sign = signMatch || '-';
    const amount = parseInt(amountStr, 10);
    const date = new Date();
    
    if (unit === 'd') {
      date.setDate(date.getDate() + (sign === '+' ? amount : -amount));
    } else if (unit === 'w') {
      date.setDate(date.getDate() + (sign === '+' ? amount * 7 : -amount * 7));
    } else if (unit === 'm') {
      date.setMonth(date.getMonth() + (sign === '+' ? amount : -amount));
    } else if (unit === 'y') {
      date.setFullYear(date.getFullYear() + (sign === '+' ? amount : -amount));
    }
    
    return { operator: sign === '+' ? '<' : '>', value: date.toISOString() };
  }
  
  // If nothing else matches, try to parse as a standard date
  const parsedDate = new Date(normalized);
  if (!isNaN(parsedDate.getTime())) {
    // Assume they want documents since this date
    return { operator: '>=', value: parsedDate.toISOString() };
  }
  
  return null;
}

/**
 * Get a human-readable description of what the parsed filter means
 * @param filter The DateFilter to describe
 * @returns Human-readable description
 */
export function describeDateFilter(filter: DateFilter): string {
  const date = new Date(filter.value);
  const dateStr = date.toLocaleDateString();
  
  switch (filter.operator) {
    case '>':
      return `after ${dateStr}`;
    case '>=':
      return `since ${dateStr}`;
    case '<':
      return `before ${dateStr}`;
    case '<=':
      return `until ${dateStr}`;
    default:
      return `${filter.operator} ${dateStr}`;
  }
}