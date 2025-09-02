import { useState, useEffect } from 'react';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import { PipelinePanels } from './PipelinePanels';
import { SearchModeToggle } from './SearchModeToggle';
import { SimilarityIndexingWarning } from './SimilarityStatusIndicator';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function QueryBar() {
  const currentTab = useCurrentTab();
  const [query, setQuery] = useState(currentTab?.searchQuery || '');
  const [panelCloseCallback, setPanelCloseCallback] = useState(null);
  const { setSearchQuery, fetchDocuments, performSimilaritySearch } = useDocumentStore();
  const searchMode = currentTab?.searchMode || 'text';
  
  // Update local query when tab changes
  useEffect(() => {
    setQuery(currentTab?.searchQuery || '');
  }, [currentTab?.tabId, currentTab?.searchQuery]);
  
  useEffect(() => {
    // Debounce search
    const timeout = setTimeout(() => {
      setSearchQuery(query);
      
      // Perform appropriate search based on mode
      if (searchMode === 'similarity' && query) {
        performSimilaritySearch(query);
      } else if (searchMode === 'text') {
        fetchDocuments();
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [query, setSearchQuery, fetchDocuments, searchMode, performSimilaritySearch]);
  
  const searchBar = (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md space-y-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchMode === 'similarity' ? "Enter semantic search query..." : "Search all fields..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (panelCloseCallback) {
                panelCloseCallback();
              }
            }}
            className="pl-10 h-9 text-sm"
          />
        </div>
        {/* Show warning when indexing is in progress */}
        <SimilarityIndexingWarning />
      </div>
      <SearchModeToggle />
    </div>
  );
  
  return (
    <div className="mb-2">
      <PipelinePanels searchBar={searchBar} onCloseCallbackChange={setPanelCloseCallback} />
    </div>
  );
}