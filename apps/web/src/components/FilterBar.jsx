import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { MetadataFilter } from './MetadataFilter';

export function FilterBar() {
  const { documents, filteredDocuments, vaultTotal, filters, setFilters } = useDocumentStore();
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [vaultPath, setVaultPath] = useState('');
  
  // Fetch config on mount
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${apiUrl}/api/config`)
      .then(res => res.json())
      .then(data => setVaultPath(data.vaultPath))
      .catch(err => console.error('Failed to fetch config:', err));
  }, []);
  
  // Apply filters when they change
  useEffect(() => {
    // Clean up filters - remove empty strings
    const cleanFilters = Object.entries(localFilters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    setFilters(cleanFilters);
  }, [localFilters, setFilters]);
  
  // Extract unique folders from current documents
  const uniqueFolders = [...new Set(
    documents.map(doc => {
      const path = doc.path.replace(vaultPath, '');
      const lastSlash = path.lastIndexOf('/');
      return lastSlash > 0 ? path.substring(0, lastSlash) : '/';
    })
  )].sort();
  
  
  // Format active filter summary
  const getFilterSummary = () => {
    const parts = [];
    
    if (localFilters.folders?.length === 1) {
      parts.push(`Folders: ${localFilters.folders[0]}`);
    } else if (localFilters.folders?.length > 1) {
      parts.push(`Folders: ${localFilters.folders.length} folders`);
    }
    
    if (localFilters.metadata?.length === 1) {
      parts.push(`Metadata: ${localFilters.metadata[0]}`);
    } else if (localFilters.metadata?.length > 1) {
      parts.push(`Metadata: ${localFilters.metadata.length} keys`);
    }
    
    if (localFilters.dateExpression) {
      parts.push(`Date: ${localFilters.dateExpression}`);
    }
    
    if (localFilters.sizeExpression) {
      parts.push(`Size: ${localFilters.sizeExpression}`);
    }
    
    return parts.length > 0 ? ' | ' + parts.join(' | ') : '';
  };
  
  

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Name filter */}
      <Input
        type="text"
        placeholder="Name..."
        value={localFilters.name || ''}
        onChange={(e) => setLocalFilters({ ...localFilters, name: e.target.value })}
        className="h-8 w-32 text-sm"
      />
      
      {/* Content filter */}
      <Input
        type="text"
        placeholder="Content..."
        value={localFilters.content || ''}
        onChange={(e) => setLocalFilters({ ...localFilters, content: e.target.value })}
        className="h-8 w-32 text-sm"
      />
      
      {/* Folders dropdown */}
      <MultiSelectDropdown
        items={uniqueFolders}
        selectedItems={localFilters.folders || []}
        onSelectionChange={(folders) => setLocalFilters({ ...localFilters, folders })}
        placeholder="Folders"
      />
      
      {/* Metadata filter */}
      <MetadataFilter
        documents={documents}
        selectedMetadata={localFilters.metadata || []}
        onMetadataChange={(metadata) => setLocalFilters({ ...localFilters, metadata })}
      />
      
      {/* Date filter */}
      <Input
        type="text"
        placeholder="< 7 days"
        value={localFilters.dateExpression || ''}
        onChange={(e) => {
          const value = e.target.value;
          setLocalFilters({ 
            ...localFilters, 
            dateExpression: value || undefined
          });
        }}
        className="h-8 w-32 text-sm"
        title="Examples: < 7 days, last 30 days, > 2024-01-01, since 2024"
      />
      
      {/* Size filter */}
      <Input
        type="text"
        placeholder="over 1mb"
        value={localFilters.sizeExpression || ''}
        onChange={(e) => {
          const value = e.target.value;
          setLocalFilters({ 
            ...localFilters, 
            sizeExpression: value || undefined
          });
        }}
        className="h-8 w-24 text-sm"
        title="Examples: under 10k, > 1mb, <= 500k, at least 100k"
      />
      
      {/* Active filter summary */}
      <span className="text-sm text-muted-foreground ml-auto">
        {filteredDocuments.length}/{vaultTotal} docs{getFilterSummary()}
      </span>
    </div>
  );
}