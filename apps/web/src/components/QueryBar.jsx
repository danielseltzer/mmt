import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { PipelinePanels } from './PipelinePanels';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function QueryBar() {
  const [query, setQuery] = useState('');
  const { setSearchQuery, fetchDocuments } = useDocumentStore();
  
  useEffect(() => {
    // Debounce search
    const timeout = setTimeout(() => {
      setSearchQuery(query);
      fetchDocuments();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [query, setSearchQuery, fetchDocuments]);
  
  const searchBar = (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search all fields..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 h-9 text-sm"
      />
    </div>
  );
  
  return (
    <div className="mb-2">
      <PipelinePanels searchBar={searchBar} />
    </div>
  );
}