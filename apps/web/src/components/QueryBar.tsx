import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { SearchModeToggle } from './SearchModeToggle';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function QueryBar() {
  const { getActiveTab, updateSearch } = useDocumentStore();
  const currentTab = getActiveTab();
  const [query, setQuery] = useState(currentTab?.searchQuery || '');
  
  // Update local query when tab changes
  useEffect(() => {
    setQuery(currentTab?.searchQuery || '');
  }, [currentTab?.id, currentTab?.searchQuery]);

  useEffect(() => {
    // Debounce search
    const timeout = setTimeout(() => {
      if (currentTab) {
        updateSearch(currentTab.id, query);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, currentTab?.id]); // Remove updateSearch to prevent infinite loop

  const searchMode = currentTab?.searchMode || 'text';
  const placeholder = searchMode === 'similarity'
    ? "Enter semantic search query..."
    : "Search documents...";

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
        <SearchModeToggle />
      </div>
    </div>
  );
}