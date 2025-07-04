import { useState } from 'react';
import { useDocumentStore } from '../stores/document-store';

export function QueryBar() {
  const [query, setQuery] = useState('');
  const { executeQuery, isLoading, currentQuery } = useDocumentStore((state) => ({
    executeQuery: state.executeQuery,
    isLoading: state.isLoading,
    currentQuery: state.currentQuery,
  }));

  const handleSearch = async () => {
    if (!query.trim() && !currentQuery) return;
    await executeQuery(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSearch();
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter query (e.g., tag:important modified:>2024-01-01)"
          className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        />
        <button
          onClick={() => {
            void handleSearch();
          }}
          disabled={isLoading || (!query.trim() && !currentQuery)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={() => {
            setQuery('');
            void executeQuery('');
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        Examples: <code className="bg-muted px-1 rounded">tag:project</code>,{' '}
        <code className="bg-muted px-1 rounded">path:*/archive/*</code>,{' '}
        <code className="bg-muted px-1 rounded">has:frontmatter.status</code>
      </div>
    </div>
  );
}