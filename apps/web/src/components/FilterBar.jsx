import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export function FilterBar() {
  const { documents, filteredDocuments, filters, setFilters } = useDocumentStore();
  const [localFilters, setLocalFilters] = useState(filters || {});
  
  // Apply filters when they change
  useEffect(() => {
    setFilters(localFilters);
  }, [localFilters, setFilters]);
  
  // Extract unique folders from current documents
  const vaultPath = '/Users/danielseltzer/Notes/Personal-sync-250710';
  const uniqueFolders = [...new Set(
    documents.map(doc => {
      const path = doc.path.replace(vaultPath, '');
      const lastSlash = path.lastIndexOf('/');
      return lastSlash > 0 ? path.substring(0, lastSlash) : '/';
    })
  )].sort();
  
  // Extract unique tags
  const uniqueTags = [...new Set(
    documents.flatMap(doc => doc.metadata.tags || [])
  )].sort();
  
  // Format active filter summary
  const getFilterSummary = () => {
    const parts = [];
    
    if (localFilters.folders?.length === 1) {
      parts.push(`Folders: ${localFilters.folders[0]}`);
    } else if (localFilters.folders?.length > 1) {
      parts.push(`Folders: ${localFilters.folders.length} folders`);
    }
    
    if (localFilters.tags?.length === 1) {
      parts.push(`Tags: ${localFilters.tags[0]}`);
    } else if (localFilters.tags?.length > 1) {
      parts.push(`Tags: ${localFilters.tags.length} tags`);
    }
    
    if (localFilters.date) {
      parts.push(`Date: ${localFilters.date.operator}${localFilters.date.value}`);
    }
    
    if (localFilters.size) {
      parts.push(`Size: ${localFilters.size.operator}${localFilters.size.value}`);
    }
    
    return parts.length > 0 ? ' | ' + parts.join(' | ') : '';
  };
  
  // Get tooltip for folder/tag counts
  const getFolderTooltip = () => {
    return localFilters.folders?.join('\n') || '';
  };
  
  const getTagTooltip = () => {
    return localFilters.tags?.join('\n') || '';
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
      
      {/* Tags dropdown */}
      <MultiSelectDropdown
        items={uniqueTags}
        selectedItems={localFilters.tags || []}
        onSelectionChange={(tags) => setLocalFilters({ ...localFilters, tags })}
        placeholder="Tags"
      />
      
      {/* Date filter */}
      <Input
        type="text"
        placeholder="Date..."
        value={localFilters.date ? `${localFilters.date.operator}${localFilters.date.value}` : ''}
        onChange={(e) => {
          const value = e.target.value.trim();
          if (!value) {
            const { date, ...rest } = localFilters;
            setLocalFilters(rest);
            return;
          }
          
          // Parse date filter (e.g., "-30d", "<1/1/2025")
          const match = value.match(/^([<>]=?)(.+)$/);
          if (match) {
            setLocalFilters({ 
              ...localFilters, 
              date: { 
                operator: match[1], 
                value: match[2] 
              } 
            });
          }
        }}
        className="h-8 w-24 text-sm"
      />
      
      {/* Size filter */}
      <Input
        type="text"
        placeholder="Size..."
        value={localFilters.size ? `${localFilters.size.operator}${localFilters.size.value}` : ''}
        onChange={(e) => {
          const value = e.target.value.trim();
          if (!value) {
            const { size, ...rest } = localFilters;
            setLocalFilters(rest);
            return;
          }
          
          // Parse size filter (e.g., "<1k", ">10M")
          const match = value.match(/^([<>]=?)(.+)$/);
          if (match) {
            setLocalFilters({ 
              ...localFilters, 
              size: { 
                operator: match[1], 
                value: match[2] 
              } 
            });
          }
        }}
        className="h-8 w-24 text-sm"
      />
      
      {/* Active filter summary */}
      <span className="text-sm text-muted-foreground ml-auto">
        {filteredDocuments.length}/{documents.length} docs{getFilterSummary()}
      </span>
    </div>
  );
}