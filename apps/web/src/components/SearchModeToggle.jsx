import { useEffect, useRef } from 'react';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchModeToggle() {
  const currentTab = useCurrentTab();
  const setSearchMode = useDocumentStore(state => state.setSearchMode);
  const similarityAvailable = useDocumentStore(state => state.similarityAvailable);
  const searchMode = currentTab?.searchMode || 'text';
  const hasCheckedRef = useRef(false);
  
  // If similarity is not available but is selected, switch to text mode
  // Use a ref to prevent infinite loops
  useEffect(() => {
    if (!similarityAvailable && searchMode === 'similarity' && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      setSearchMode('text');
    } else if (similarityAvailable || searchMode === 'text') {
      hasCheckedRef.current = false;
    }
  }, [similarityAvailable, searchMode, setSearchMode]);
  
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
      <Button
        variant={searchMode === 'text' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setSearchMode('text')}
        className={cn(
          "h-7 px-2 text-xs font-medium transition-colors",
          searchMode === 'text' && "shadow-sm"
        )}
      >
        <Search className="h-3 w-3 mr-1" />
        Text Search
      </Button>
      
      <Button
        variant={searchMode === 'similarity' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setSearchMode('similarity')}
        disabled={!similarityAvailable}
        className={cn(
          "h-7 px-2 text-xs font-medium transition-colors",
          searchMode === 'similarity' && "shadow-sm",
          !similarityAvailable && "opacity-50 cursor-not-allowed"
        )}
        title={!similarityAvailable ? "Similarity search is not configured" : "Search by semantic similarity"}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Similarity
      </Button>
    </div>
  );
}