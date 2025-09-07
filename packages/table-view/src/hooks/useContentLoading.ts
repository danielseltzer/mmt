import { useState, useCallback, useRef, useEffect } from 'react';
import { TableCore } from '../core/TableCore';
import { getDocumentId } from '../core/utils';

export interface UseContentLoadingReturn {
  /** Load content for a specific document */
  loadContent: (docPath: string) => Promise<string | null>;
  /** Preload content for multiple documents */
  preloadContent: (docPaths: string[]) => Promise<void>;
  /** Get cached content or trigger load if not available */
  getContent: (docPath: string) => string | null;
  /** Check if content is currently loading for a document */
  isLoading: (docPath: string) => boolean;
  /** Check if content is cached for a document */
  hasContent: (docPath: string) => boolean;
  /** Clear all cached content */
  clearCache: () => void;
  /** Map of loading states per document path */
  loadingStates: Map<string, boolean>;
  /** Map of errors per document path */
  errors: Map<string, Error>;
}

/**
 * React hook for managing document content loading and caching
 * Integrates with TableCore's content cache and provides loading state management
 * 
 * @param tableCore - TableCore instance to use for caching
 * @param apiUrl - Base URL for content API endpoints
 * @returns Content loading state and control methods
 */
export function useContentLoading(
  tableCore: TableCore | null,
  apiUrl: string
): UseContentLoadingReturn {
  // Track loading states for each document
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(
    () => new Map()
  );
  
  // Track errors for each document
  const [errors, setErrors] = useState<Map<string, Error>>(
    () => new Map()
  );
  
  // Track active fetch operations to prevent duplicates
  const activeRequests = useRef<Map<string, Promise<string | null>>>(new Map());
  
  // Clear caches when tableCore changes
  useEffect(() => {
    if (!tableCore) {
      setLoadingStates(new Map());
      setErrors(new Map());
      activeRequests.current.clear();
    }
  }, [tableCore]);
  
  /**
   * Load content for a specific document
   * Uses TableCore's cache and prevents duplicate requests
   */
  const loadContent = useCallback(async (docPath: string): Promise<string | null> => {
    if (!tableCore) {
      console.warn('TableCore not available for content loading');
      return null;
    }
    
    // Check if content is already cached
    const cached = tableCore.getCachedContent(docPath);
    if (cached !== undefined) {
      return cached;
    }
    
    // Check if request is already in progress
    const existingRequest = activeRequests.current.get(docPath);
    if (existingRequest) {
      return existingRequest;
    }
    
    // Start loading
    setLoadingStates(prev => new Map(prev).set(docPath, true));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(docPath); // Clear any previous error
      return next;
    });
    
    // Create fetch promise
    const fetchPromise = fetch(`${apiUrl}/api/content?path=${encodeURIComponent(docPath)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load content: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const content = data.content || '';
        
        // Cache the content in TableCore
        tableCore.cacheContent(docPath, content);
        
        return content;
      })
      .catch((error) => {
        // Record error
        setErrors(prev => new Map(prev).set(docPath, error));
        console.error(`Error loading content for ${docPath}:`, error);
        return null;
      })
      .finally(() => {
        // Clear loading state and active request
        setLoadingStates(prev => {
          const next = new Map(prev);
          next.delete(docPath);
          return next;
        });
        activeRequests.current.delete(docPath);
      });
    
    // Store active request
    activeRequests.current.set(docPath, fetchPromise);
    
    return fetchPromise;
  }, [tableCore, apiUrl]);
  
  /**
   * Preload content for multiple documents
   * Useful for prefetching content that will likely be needed soon
   */
  const preloadContent = useCallback(async (docPaths: string[]): Promise<void> => {
    if (!tableCore || docPaths.length === 0) {
      return;
    }
    
    // Filter out already cached content
    const pathsToLoad = docPaths.filter(path => {
      const cached = tableCore.getCachedContent(path);
      const isActive = activeRequests.current.has(path);
      return cached === undefined && !isActive;
    });
    
    if (pathsToLoad.length === 0) {
      return;
    }
    
    // Load all uncached content in parallel
    const promises = pathsToLoad.map(path => loadContent(path));
    await Promise.all(promises);
  }, [tableCore, loadContent]);
  
  /**
   * Get cached content or trigger load if not available
   * Returns null if content is not cached and starts loading in background
   */
  const getContent = useCallback((docPath: string): string | null => {
    if (!tableCore) {
      return null;
    }
    
    // Try to get from cache first
    const cached = tableCore.getCachedContent(docPath);
    if (cached !== undefined) {
      return cached;
    }
    
    // If not cached and not loading, start loading in background
    const isLoadingNow = loadingStates.get(docPath);
    const hasActiveRequest = activeRequests.current.has(docPath);
    
    if (!isLoadingNow && !hasActiveRequest) {
      // Fire and forget - load in background
      loadContent(docPath).catch(() => {
        // Error is already handled in loadContent
      });
    }
    
    return null;
  }, [tableCore, loadingStates, loadContent]);
  
  /**
   * Check if content is currently loading for a document
   */
  const isLoading = useCallback((docPath: string): boolean => {
    return loadingStates.get(docPath) === true;
  }, [loadingStates]);
  
  /**
   * Check if content is cached for a document
   */
  const hasContent = useCallback((docPath: string): boolean => {
    if (!tableCore) {
      return false;
    }
    return tableCore.getCachedContent(docPath) !== undefined;
  }, [tableCore]);
  
  /**
   * Clear all cached content
   */
  const clearCache = useCallback((): void => {
    if (!tableCore) {
      return;
    }
    
    // Clear TableCore's cache
    tableCore.clearContentCache();
    
    // Clear all loading states and errors
    setLoadingStates(new Map());
    setErrors(new Map());
    
    // Cancel any active requests
    activeRequests.current.clear();
  }, [tableCore]);
  
  return {
    loadContent,
    preloadContent,
    getContent,
    isLoading,
    hasContent,
    clearCache,
    loadingStates,
    errors,
  };
}