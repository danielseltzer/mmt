import { useDocumentStore } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchModeToggle() {
  const { searchMode, setSearchMode } = useDocumentStore();
  
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
        className={cn(
          "h-7 px-2 text-xs font-medium transition-colors",
          searchMode === 'similarity' && "shadow-sm"
        )}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Similarity
      </Button>
    </div>
  );
}