import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';

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
  
  return (
    <div className="query-bar">
      <input
        type="text"
        placeholder="Search documents..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="query-input"
      />
    </div>
  );
}