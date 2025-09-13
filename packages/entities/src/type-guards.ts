/**
 * Common type guards used throughout the MMT codebase
 * Centralized to avoid duplication and ensure consistency
 */

import type { Document, FilterCondition, SelectCriteria, FilterCollection } from './index.js';

/**
 * Type guard for axios-like errors with response property
 */
export function isAxiosLikeError(error: unknown): error is { response?: { status: number; data?: unknown } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error
  );
}

/**
 * Type guard for Document type
 */
export function isDocument(value: unknown): value is Document {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    'path' in value &&
    'metadata' in value
  );
}

/**
 * Type guard for FilterCondition
 */
export function isFilterCondition(value: unknown): value is FilterCondition {
  return (
    value !== null &&
    typeof value === 'object' &&
    'field' in value &&
    'operator' in value &&
    'value' in value
  );
}

/**
 * Type guard for FilterCollection
 */
export function isFilterCollection(value: unknown): value is FilterCollection {
  return (
    value !== null &&
    typeof value === 'object' &&
    'conditions' in value
  );
}

/**
 * Type guard for SelectCriteria with filters
 */
export function hasFilters(criteria: SelectCriteria): criteria is SelectCriteria & { filters: FilterCollection } {
  return 'filters' in criteria && criteria.filters !== undefined;
}

/**
 * Type guard for SelectCriteria with limit
 */
export function hasLimit(criteria: SelectCriteria): criteria is SelectCriteria & { limit: number } {
  return 'limit' in criteria && criteria.limit !== undefined && criteria.limit > 0;
}

/**
 * Type guard for objects with a specific property
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  prop: K
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * Type guard for non-null values
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Type guard for non-undefined values
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Type guard for string values
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number values
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for boolean values
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for array values
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for Date values
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard for objects (excluding null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for functions
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Namespace for commonly used type guards
 */
export const TypeGuards = {
  isAxiosLikeError,
  isDocument,
  isFilterCondition,
  isFilterCollection,
  hasFilters,
  hasLimit,
  hasProperty,
  isNotNull,
  isDefined,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isDate,
  isObject,
  isFunction,
};