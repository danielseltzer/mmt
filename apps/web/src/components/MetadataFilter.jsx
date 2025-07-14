import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export function MetadataFilter({ documents, selectedMetadata, onMetadataChange }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Extract all unique metadata keys
  const allMetadataKeys = useMemo(() => {
    const keys = new Set();
    documents.forEach(doc => {
      if (doc.metadata?.frontmatter) {
        Object.keys(doc.metadata.frontmatter).forEach(key => keys.add(key));
      }
    });
    return [...keys].sort();
  }, [documents]);
  
  // Extract unique values for the selected key
  const valuesForSelectedKey = useMemo(() => {
    if (!selectedKey) return [];
    
    const values = new Set();
    documents.forEach(doc => {
      if (doc.metadata?.frontmatter?.[selectedKey]) {
        const value = doc.metadata.frontmatter[selectedKey];
        // Handle arrays (like tags in frontmatter)
        if (Array.isArray(value)) {
          value.forEach(v => values.add(String(v)));
        } else {
          values.add(String(value));
        }
      }
    });
    return [...values].sort();
  }, [documents, selectedKey]);
  
  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!inputValue) return [];
    
    const searchTerm = inputValue.toLowerCase();
    
    if (!selectedKey) {
      // Show matching keys
      return allMetadataKeys
        .filter(key => key.toLowerCase().includes(searchTerm))
        .slice(0, 10);
    } else {
      // Show matching values for the selected key
      const valueSearch = inputValue.substring(selectedKey.length + 1).toLowerCase();
      return valuesForSelectedKey
        .filter(value => value.toLowerCase().includes(valueSearch))
        .slice(0, 10);
    }
  }, [inputValue, selectedKey, allMetadataKeys, valuesForSelectedKey]);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // If user deletes the colon, clear the selected key
    if (selectedKey && !value.includes(':')) {
      setSelectedKey('');
    }
    
    setShowSuggestions(true);
  };
  
  const handleKeySelect = (key) => {
    setSelectedKey(key);
    setInputValue(key + ':');
    setShowSuggestions(true);
  };
  
  const handleValueSelect = (value) => {
    const fullValue = `${selectedKey}:${value}`;
    const newMetadata = [...(selectedMetadata || []), fullValue];
    onMetadataChange(newMetadata);
    
    // Reset for next selection
    setInputValue('');
    setSelectedKey('');
    setShowSuggestions(false);
  };
  
  const removeMetadata = (metadata) => {
    onMetadataChange(selectedMetadata.filter(m => m !== metadata));
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.includes(':')) {
      const [key, value] = inputValue.split(':');
      if (key && value && value.trim()) {
        const fullValue = `${key}:${value.trim()}`;
        if (!selectedMetadata?.includes(fullValue)) {
          onMetadataChange([...(selectedMetadata || []), fullValue]);
        }
        setInputValue('');
        setSelectedKey('');
      }
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="text"
          placeholder="Metadata..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="h-8 w-48 text-sm"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  if (!selectedKey) {
                    handleKeySelect(suggestion);
                  } else {
                    handleValueSelect(suggestion);
                  }
                }}
              >
                {!selectedKey ? suggestion : `${selectedKey}:${suggestion}`}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected metadata badges */}
      {selectedMetadata && selectedMetadata.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMetadata.map((metadata, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {metadata}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => removeMetadata(metadata)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}