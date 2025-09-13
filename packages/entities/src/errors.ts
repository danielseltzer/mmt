/**
 * Standardized error classes for MMT application
 * Provides consistent error handling across all packages
 */

/**
 * Base error class for all MMT errors
 * Extends the built-in Error class with additional properties
 */
export class MmtError extends Error {
  /** Error code for programmatic identification */
  public readonly code: string;
  /** HTTP status code for API responses */
  public readonly statusCode: number;
  /** Additional error details for debugging */
  public readonly details?: unknown;
  /** Timestamp when the error occurred */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends MmtError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', 500, details);
  }
}

/**
 * Validation errors for invalid input data
 */
export class ValidationError extends MmtError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends MmtError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier });
  }
}

/**
 * Unauthorized access errors
 */
export class UnauthorizedError extends MmtError {
  constructor(message = 'Unauthorized access', details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

/**
 * Forbidden access errors
 */
export class ForbiddenError extends MmtError {
  constructor(message = 'Access forbidden', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends MmtError {
  constructor(message: string, operation: string, path?: string) {
    super(message, 'FILESYSTEM_ERROR', 500, { operation, path });
  }
}

/**
 * Indexer-related errors
 */
export class IndexerError extends MmtError {
  constructor(message: string, details?: unknown) {
    super(message, 'INDEXER_ERROR', 500, details);
  }
}

/**
 * Vault-related errors
 */
export class VaultError extends MmtError {
  constructor(message: string, vaultId?: string, details?: unknown) {
    const errorDetails = details !== null && details !== undefined
      ? { vaultId, ...(details as Record<string, unknown>) }
      : { vaultId };
    super(message, 'VAULT_ERROR', 500, errorDetails);
  }
}

/**
 * Operation execution errors
 */
export class OperationError extends MmtError {
  constructor(operation: string, message: string, details?: unknown) {
    const errorDetails = details !== null && details !== undefined
      ? { operation, ...(details as Record<string, unknown>) }
      : { operation };
    super(message, 'OPERATION_ERROR', 500, errorDetails);
  }
}

/**
 * Timeout errors for long-running operations
 */
export class TimeoutError extends MmtError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${String(timeoutMs)}ms`,
      'TIMEOUT_ERROR',
      504,
      { operation, timeoutMs }
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends MmtError {
  constructor(limit: number, resetTime?: Date) {
    super(
      `Rate limit exceeded. Limit: ${String(limit)} requests`,
      'RATE_LIMIT_ERROR',
      429,
      { limit, resetTime }
    );
  }
}

/**
 * Conflict errors for concurrent operations
 */
export class ConflictError extends MmtError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

/**
 * Service unavailable errors
 */
export class ServiceUnavailableError extends MmtError {
  constructor(service: string, reason?: string) {
    const message = reason
      ? `Service '${service}' is unavailable: ${reason}`
      : `Service '${service}' is unavailable`;
    super(message, 'SERVICE_UNAVAILABLE', 503, { service, reason });
  }
}

/**
 * Type guard to check if an error is an MmtError
 */
export function isMmtError(error: unknown): error is MmtError {
  return error instanceof MmtError;
}

/**
 * Type guard to check if an error is any Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Converts any error to MmtError
 * Useful for standardizing error handling
 */
export function toMmtError(error: unknown): MmtError {
  if (isMmtError(error)) {
    return error;
  }

  if (isError(error)) {
    // Check for specific error types and convert appropriately
    if (error.message.includes('ENOENT')) {
      return new FileSystemError(error.message, 'read');
    }
    if (error.message.includes('EACCES')) {
      return new FileSystemError(error.message, 'permission');
    }
    if (error.message.includes('validation')) {
      return new ValidationError(error.message);
    }

    // Default conversion
    return new MmtError(error.message, 'UNKNOWN_ERROR', 500, {
      originalError: error.name,
      stack: error.stack
    });
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return new MmtError(error, 'UNKNOWN_ERROR', 500);
  }

  return new MmtError('An unknown error occurred', 'UNKNOWN_ERROR', 500, {
    originalError: error
  });
}

/**
 * Error codes enum for consistent error identification
 */
export enum ErrorCode {
  // Configuration errors
  Config = 'CONFIG_ERROR',
  ConfigInvalid = 'CONFIG_INVALID',
  ConfigMissing = 'CONFIG_MISSING',

  // Validation errors
  Validation = 'VALIDATION_ERROR',
  InvalidInput = 'INVALID_INPUT',
  InvalidFormat = 'INVALID_FORMAT',

  // Resource errors
  NotFound = 'NOT_FOUND',
  AlreadyExists = 'ALREADY_EXISTS',

  // Access errors
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',

  // File system errors
  FilesystemError = 'FILESYSTEM_ERROR',
  FileNotFound = 'FILE_NOT_FOUND',
  PermissionDenied = 'PERMISSION_DENIED',

  // Operation errors
  Operation = 'OPERATION_ERROR',
  OperationFailed = 'OPERATION_FAILED',

  // System errors
  InternalError = 'INTERNAL_ERROR',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  Timeout = 'TIMEOUT_ERROR',
  RateLimit = 'RATE_LIMIT_ERROR',

  // Unknown errors
  UnknownError = 'UNKNOWN_ERROR'
}