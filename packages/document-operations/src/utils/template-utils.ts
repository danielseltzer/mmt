/**
 * Template expansion utilities
 */

export interface TemplateContext {
  name: string;
  date?: string;
  timestamp?: string;
  counter?: number;
}

/**
 * Expand template variables in a string
 * Supports: {name}, {date}, {timestamp}, {counter}
 */
export function expandTemplate(template: string, context: TemplateContext): string {
  if (!template) return '';
  
  const now = new Date();
  const date = context.date || now.toISOString().split('T')[0];
  const timestamp = context.timestamp || now.toISOString();
  const counter = context.counter || 1;
  
  return template
    .replace(/\{name\}/g, context.name)
    .replace(/\{date\}/g, date)
    .replace(/\{timestamp\}/g, timestamp)
    .replace(/\{counter\}/g, String(counter));
}

/**
 * Get list of available template variables
 */
export function getTemplateVariables(): string[] {
  return ['{name}', '{date}', '{timestamp}', '{counter}'];
}

/**
 * Check if a string contains template variables
 */
export function hasTemplateVariables(template: string): boolean {
  return /\{(name|date|timestamp|counter)\}/.test(template);
}