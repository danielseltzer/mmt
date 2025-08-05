import { useState, useEffect } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { MetadataFilter } from './MetadataFilter';
import { parseDateExpression, parseSizeExpression } from '../utils/filter-utils';

export function FilterBar() {
  const { documents, filteredDocuments, vaultTotal, setFilters } = useDocumentStore();
  // Store individual filter values for the UI
  const [filterValues, setFilterValues] = useState({
    name: '',
    content: '',
    folders: [],
    metadata: [],
    dateExpression: '',
    sizeExpression: ''
  });
  const [vaultPath, setVaultPath] = useState('');
  
  // Fetch vault path from API on mount
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setVaultPath(data.vaultPath))
      .catch(err => console.error('Failed to fetch vault config:', err));
  }, []);
  
  // Convert filter values to FilterCollection format when they change
  useEffect(() => {
    const conditions = [];
    
    // Name filter
    if (filterValues.name) {
      conditions.push({
        field: 'name',
        operator: 'contains',
        value: filterValues.name,
        caseSensitive: false
      });
    }
    
    // Content filter
    if (filterValues.content) {
      conditions.push({
        field: 'content',
        operator: 'contains',
        value: filterValues.content,
        caseSensitive: false
      });
    }
    
    // Folders filter
    if (filterValues.folders && filterValues.folders.length > 0) {
      conditions.push({
        field: 'folders',
        operator: 'in',
        value: filterValues.folders
      });
    }
    
    // Metadata filters - each becomes a separate condition
    if (filterValues.metadata && filterValues.metadata.length > 0) {
      filterValues.metadata.forEach(metaFilter => {
        const [key, value] = metaFilter.split(':');
        if (key) {
          conditions.push({
            field: 'metadata',
            key,
            operator: 'equals',
            value: value === undefined ? true : value
          });
        }
      });
    }
    
    // Date filter - parse natural language
    if (filterValues.dateExpression) {
      try {
        const parsed = parseDateExpression(filterValues.dateExpression);
        if (parsed) {
          // Convert relative dates to actual ISO date strings
          let dateValue = parsed.value;
          
          // Check if it's a relative date expression like "-7d"
          if (typeof dateValue === 'string' && dateValue.match(/^-\d+d$/)) {
            const days = parseInt(dateValue.substring(1, dateValue.length - 1));
            const date = new Date();
            date.setDate(date.getDate() - days);
            dateValue = date.toISOString();
          }
          
          conditions.push({
            field: 'modified',
            operator: parsed.operator,
            value: dateValue
          });
        }
      } catch {
        console.warn('Invalid date expression:', filterValues.dateExpression);
      }
    }
    
    // Size filter - parse natural language
    if (filterValues.sizeExpression) {
      try {
        const parsed = parseSizeExpression(filterValues.sizeExpression);
        if (parsed) {
          conditions.push({
            field: 'size',
            operator: parsed.operator,
            value: parseInt(parsed.value) // Convert string to number
          });
        }
      } catch {
        console.warn('Invalid size expression:', filterValues.sizeExpression);
      }
    }
    
    // Set the FilterCollection
    const filterCollection = {
      conditions,
      logic: 'AND'
    };
    
    setFilters(filterCollection);
  }, [filterValues, setFilters]);
  
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
    
    if (filterValues.folders?.length === 1) {
      parts.push(`Folders: ${filterValues.folders[0]}`);
    } else if (filterValues.folders?.length > 1) {
      parts.push(`Folders: ${filterValues.folders.length} folders`);
    }
    
    if (filterValues.metadata?.length === 1) {
      parts.push(`Metadata: ${filterValues.metadata[0]}`);
    } else if (filterValues.metadata?.length > 1) {
      parts.push(`Metadata: ${filterValues.metadata.length} keys`);
    }
    
    if (filterValues.dateExpression) {
      parts.push(`Date: ${filterValues.dateExpression}`);
    }
    
    if (filterValues.sizeExpression) {
      parts.push(`Size: ${filterValues.sizeExpression}`);
    }
    
    return parts.length > 0 ? ' | ' + parts.join(' | ') : '';
  };
  
  

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Name filter */}
      <Input
        type="text"
        placeholder="Name..."
        value={filterValues.name}
        onChange={(e) => setFilterValues({ ...filterValues, name: e.target.value })}
        className="h-8 w-32 text-sm"
      />
      
      {/* Content filter */}
      <Input
        type="text"
        placeholder="Content..."
        value={filterValues.content}
        onChange={(e) => setFilterValues({ ...filterValues, content: e.target.value })}
        className="h-8 w-32 text-sm"
      />
      
      {/* Folders dropdown */}
      <MultiSelectDropdown
        items={uniqueFolders}
        selectedItems={filterValues.folders}
        onSelectionChange={(folders) => setFilterValues({ ...filterValues, folders })}
        placeholder="Folders"
      />
      
      {/* Metadata filter */}
      <MetadataFilter
        documents={documents}
        selectedMetadata={filterValues.metadata}
        onMetadataChange={(metadata) => setFilterValues({ ...filterValues, metadata })}
      />
      
      {/* Date filter */}
      <Input
        type="text"
        placeholder="< 7 days"
        value={filterValues.dateExpression}
        onChange={(e) => setFilterValues({ ...filterValues, dateExpression: e.target.value })}
        className="h-8 w-32 text-sm"
        title="Examples: < 7 days, last 30 days, > 2024-01-01, since 2024"
      />
      
      {/* Size filter */}
      <Input
        type="text"
        placeholder="over 1mb"
        value={filterValues.sizeExpression}
        onChange={(e) => setFilterValues({ ...filterValues, sizeExpression: e.target.value })}
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