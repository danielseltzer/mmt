/**
 * Centralized Winston Logger Configuration for MMT
 *
 * Provides structured logging with appropriate levels and formatting
 * for all MMT components and services.
 */
import winston from 'winston';
export declare const LogLevel: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly HTTP: "http";
    readonly VERBOSE: "verbose";
    readonly DEBUG: "debug";
    readonly SILLY: "silly";
};
export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];
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
export declare function createLogger(options?: LoggerOptions): winston.Logger;
/**
 * Component-specific logger factory
 * Creates loggers with predefined component names for consistent tagging
 */
export declare class ComponentLogger {
    private static instances;
    static get(component: string, options?: Omit<LoggerOptions, 'component'>): winston.Logger;
}
export declare const Loggers: {
    control: () => winston.Logger;
    api: () => winston.Logger;
    apiServer: () => winston.Logger;
    apiRoutes: () => winston.Logger;
    apiMiddleware: () => winston.Logger;
    similarity: () => winston.Logger;
    qdrant: () => winston.Logger;
    orama: () => winston.Logger;
    indexer: () => winston.Logger;
    fileWatcher: () => winston.Logger;
    vault: () => winston.Logger;
    vaultDebug: () => winston.Logger;
    operations: () => winston.Logger;
    pipeline: () => winston.Logger;
    web: () => winston.Logger;
    cli: () => winston.Logger;
    script: () => winston.Logger;
    default: () => winston.Logger;
};
export type Logger = winston.Logger;
export { winston };
export declare function formatError(error: unknown): object;
export declare const transports: winston.transports.Transports, format: typeof winston.format;
//# sourceMappingURL=index.d.ts.map