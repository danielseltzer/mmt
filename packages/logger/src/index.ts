/**
 * Centralized loglevel Logger Configuration for MMT
 * 
 * Provides structured logging with appropriate levels and formatting
 * for all MMT components and services. Uses loglevel for lightweight,
 * browser-compatible logging without Winston's bundle overhead.
 */

import log from 'loglevel';

// Log levels matching loglevel's defaults (and compatible with Winston)
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
  // Winston compatibility - map verbose and silly to debug/trace
  HTTP: 'debug',
  VERBOSE: 'debug',
  SILLY: 'trace'
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

// Color codes for console output
const colors = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[90m', // gray
  trace: '\x1b[90m', // gray
  reset: '\x1b[0m'
};

interface LoggerOptions {
  component?: string;
  logLevel?: LogLevelType;
  logToFile?: boolean;
  logFilePath?: string;
  silent?: boolean;
}

/**
 * Logger wrapper that provides Winston-compatible API using loglevel
 */
export class Logger {
  private component: string | undefined;
  private logger: log.Logger;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    const {
      component,
      logLevel = (typeof process !== 'undefined' && process.env?.LOG_LEVEL) || 'info',
      silent = false
    } = options;

    this.component = component;
    this.silent = silent;
    
    // Create a namespaced logger for this component
    this.logger = component ? log.getLogger(component) : log;
    
    // Map Winston levels to loglevel levels
    const mappedLevel = this.mapLogLevel(logLevel);
    this.logger.setLevel(mappedLevel as log.LogLevelDesc);

    // Override console methods to add formatting
    if (!silent) {
      this.setupConsoleFormatting();
    }
  }

  private mapLogLevel(level: string): string {
    // Map Winston-specific levels to loglevel equivalents
    const levelMap: Record<string, string> = {
      'error': 'error',
      'warn': 'warn',
      'info': 'info',
      'http': 'debug',
      'verbose': 'debug',
      'debug': 'debug',
      'silly': 'trace'
    };
    return levelMap[level.toLowerCase()] || 'info';
  }

  private setupConsoleFormatting() {
    const originalFactory = this.logger.methodFactory;
    const component = this.component;
    const silent = this.silent;
    const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

    this.logger.methodFactory = function(methodName: any, logLevel: any, loggerName: any) {
      const rawMethod = originalFactory(methodName, logLevel, loggerName);
      
      return function(...args: any[]) {
        if (silent) return;
        
        // In browser environments, don't use ANSI color codes
        if (isBrowser) {
          if (component) {
            // Prepend component name without color codes
            if (typeof args[0] === 'string') {
              args[0] = `[${component}] ${args[0]}`;
            } else {
              args.unshift(`[${component}]`);
            }
          }
        } else {
          // In Node.js, use color codes
          const levelName = methodName as keyof typeof colors;
          const color = colors[levelName] || colors.reset;
          
          let prefix = color;
          if (component) {
            prefix += `[${component}] `;
          }
          prefix += colors.reset;
          
          if (typeof args[0] === 'string') {
            args[0] = prefix + args[0];
          } else {
            args.unshift(prefix);
          }
        }
        
        rawMethod.apply(undefined, args);
      };
    };

    // Re-apply the level to use the new factory
    this.logger.setLevel(this.logger.getLevel());
  }

  // Winston-compatible logging methods
  error(message: string, ...args: any[]) {
    if (!this.silent) this.logger.error(message, ...args);
  }

  warn(message: string, ...args: any[]) {
    if (!this.silent) this.logger.warn(message, ...args);
  }

  info(message: string, ...args: any[]) {
    if (!this.silent) this.logger.info(message, ...args);
  }

  http(message: string, ...args: any[]) {
    if (!this.silent) this.logger.debug(message, ...args);
  }

  verbose(message: string, ...args: any[]) {
    if (!this.silent) this.logger.debug(message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (!this.silent) this.logger.debug(message, ...args);
  }

  silly(message: string, ...args: any[]) {
    if (!this.silent) this.logger.trace(message, ...args);
  }

  // Additional Winston compatibility
  log(level: string, message: string, ...args: any[]) {
    const method = (this as any)[level];
    if (method) {
      method.call(this, message, ...args);
    }
  }
}

/**
 * Creates a loglevel logger instance with consistent configuration
 * Maintains backward compatibility with Winston interface
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

/**
 * Component-specific logger factory
 * Creates loggers with predefined component names for consistent tagging
 */
export class ComponentLogger {
  private static instances = new Map<string, Logger>();
  
  static get(component: string, options?: Omit<LoggerOptions, 'component'>): Logger {
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

// Export winston type aliases for backward compatibility
// This allows existing code using winston.Logger to continue working
export { Logger as winston };
export type { Logger as WinstonLogger };

// Re-export transports and format as no-ops for compatibility
// These are Winston-specific concepts that don't apply to loglevel
export const transports = {};
export const format = {};