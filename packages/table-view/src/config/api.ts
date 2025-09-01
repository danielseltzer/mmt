/**
 * API Configuration for TableView package
 * This configuration MUST be set by the consuming application
 * 
 * IMPORTANT: NO DEFAULTS RULE
 * The consuming application must explicitly configure the API base URL.
 * There are no default values - configuration is required.
 */

// API configuration - must be explicitly set
let apiBaseUrl: string | undefined = undefined;
let isConfigured = false;

/**
 * Configure the API base URL
 * Must be called by the consuming application during initialization
 */
export function configureApiBaseUrl(baseUrl: string): void {
  apiBaseUrl = baseUrl;
  isConfigured = true;
}

/**
 * Get the configured API base URL
 * Throws an error if not configured
 */
export function getApiBaseUrl(): string {
  if (!isConfigured) {
    throw new Error(
      'Configuration Error: API base URL has not been configured. ' +
      'The consuming application must call configureApiBaseUrl() before using the TableView component.'
    );
  }
  return apiBaseUrl!;
}

/**
 * Construct full API URL
 * @param endpoint - The API endpoint
 * @returns Full URL for the API endpoint
 */
export function getApiEndpoint(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}