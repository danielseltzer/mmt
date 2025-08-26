import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Loggers } from '@mmt/logger';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

const logger = Loggers.web();

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

/**
 * Error boundary component to catch and display errors in the React tree
 * Provides a user-friendly error page with options to recover
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our logging service
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString()
    });

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // If we're getting repeated errors, might want to do something more drastic
    if (this.state.errorCount > 3) {
      logger.error('Multiple errors caught in error boundary', {
        errorCount: this.state.errorCount
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset state and navigate to home
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.handleReset
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-lg p-8 space-y-6">
            {/* Error Icon and Title */}
            <div className="flex items-center space-x-4 text-destructive">
              <AlertCircle className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  An unexpected error occurred in the application
                </p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <h2 className="font-semibold mb-2">Error Details:</h2>
              <p className="text-sm font-mono">{this.state.error.message}</p>
            </div>

            {/* Stack Trace (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error.stack && (
              <details className="bg-muted rounded-md p-4">
                <summary className="cursor-pointer font-semibold">
                  Technical Details (Development Mode)
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-64">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <h3 className="font-semibold mt-4">Component Stack:</h3>
                    <pre className="mt-2 text-xs overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {/* Error Count Warning */}
            {this.state.errorCount > 1 && (
              <div className="text-sm text-muted-foreground border-t pt-4">
                <p>This error has occurred {this.state.errorCount} times.</p>
                <p>If the problem persists, please contact support.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually trigger error boundary from function components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    throwError: (error: Error) => setError(error),
    clearError: () => setError(null)
  };
}