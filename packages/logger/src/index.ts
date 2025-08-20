/**
 * Centralized Winston Logger Configuration for MMT
 * 
 * Provides structured logging with appropriate levels and formatting
 * for all MMT components and services.
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Log levels following Winston defaults
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

// Custom format for console output - matches existing MMT log format
const consoleFormat = printf(({ level, message, timestamp, component, ...metadata }) => {
  let output = '';
  
  // Add component prefix if provided
  if (component) {
    output += `[${component}] `;
  }
  
  // Add message
  output += message;
  
  // Add metadata if present (excluding error stack for cleaner output)
  if (Object.keys(metadata).length > 0 && !metadata.stack) {
    const metaStr = Object.entries(metadata)
      .filter(([key]) => key !== 'error') // Error is handled separately
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');
    if (metaStr) {
      output += ` ${metaStr}`;
    }
  }
  
  return output;
});

// File format with full JSON for debugging
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

interface LoggerOptions {
  component?: string;
  logLevel?: LogLevelType;
  logToFile?: boolean;
  logFilePath?: string;
  silent?: boolean;
}

/**
 * Creates a Winston logger instance with consistent configuration
 */
export function createLogger(options: LoggerOptions = {}): winston.Logger {
  const {
    component,
    logLevel = process.env.LOG_LEVEL || 'info',
    logToFile = process.env.LOG_TO_FILE === 'true',
    logFilePath = process.env.LOG_FILE_PATH || '/tmp/mmt.log',
    silent = false
  } = options;

  const transports: winston.transport[] = [];

  // Console transport
  if (!silent) {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: combine(
          colorize({ level: true }),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          consoleFormat
        )
      })
    );
  }

  // File transport (optional)
  if (logToFile && logFilePath) {
    transports.push(
      new winston.transports.File({
        filename: logFilePath,
        level: logLevel,
        format: fileFormat
      })
    );
  }

  const logger = winston.createLogger({
    level: logLevel,
    defaultMeta: component ? { component } : {},
    transports,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: logToFile ? [
      new winston.transports.File({ 
        filename: logFilePath.replace('.log', '-exceptions.log')
      })
    ] : [],
    rejectionHandlers: logToFile ? [
      new winston.transports.File({ 
        filename: logFilePath.replace('.log', '-rejections.log')
      })
    ] : []
  });

  return logger;
}

/**
 * Component-specific logger factory
 * Creates loggers with predefined component names for consistent tagging
 */
export class ComponentLogger {
  private static instances = new Map<string, winston.Logger>();
  
  static get(component: string, options?: Omit<LoggerOptions, 'component'>): winston.Logger {
    const key = `${component}-${JSON.stringify(options || {})}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, createLogger({ ...options, component }));
    }
    
    return this.instances.get(key)!;
  }
}

// Predefined component loggers for common services
export const Loggers = {
  // Control Manager
  control: () => ComponentLogger.get('MMT Control'),
  
  // API Server components
  api: () => ComponentLogger.get('API'),
  apiServer: () => ComponentLogger.get('API Server'),
  apiRoutes: () => ComponentLogger.get('API Routes'),
  apiMiddleware: () => ComponentLogger.get('API Middleware'),
  
  // Similarity providers
  similarity: () => ComponentLogger.get('SIMILARITY'),
  qdrant: () => ComponentLogger.get('QDRANT'),
  orama: () => ComponentLogger.get('ORAMA'),
  
  // Core services
  indexer: () => ComponentLogger.get('INDEXER'),
  fileWatcher: () => ComponentLogger.get('FILE_WATCHER'),
  vault: () => ComponentLogger.get('VAULT'),
  vaultDebug: () => ComponentLogger.get('VAULT DEBUG'),
  
  // Operations
  operations: () => ComponentLogger.get('OPERATIONS'),
  pipeline: () => ComponentLogger.get('PIPELINE'),
  
  // Web app
  web: () => ComponentLogger.get('WEB'),
  
  // CLI
  cli: () => ComponentLogger.get('CLI'),
  
  // Scripting
  script: () => ComponentLogger.get('SCRIPT'),
  
  // Generic/default
  default: () => ComponentLogger.get('MMT')
};

// Export Winston types for convenience
export type Logger = winston.Logger;
export { winston };

// Helper function to format error objects for logging
export function formatError(error: unknown): object {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error as any) // Include any additional error properties
    };
  }
  return { error: String(error) };
}

// Re-export common Winston methods for convenience
export const { transports, format } = winston;