/**
 * Search Mode Toggle - For switching between text and similarity search
 */

import React from 'react';
import { useDocumentStore } from '../stores/document-store';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchModeToggle() {
  const { getActiveTab, setSearchMode } = useDocumentStore();
  const currentTab = getActiveTab();
  
  if (!currentTab) return null;
  
  const searchMode = currentTab.searchMode;
  
  const handleModeChange = (mode: 'text' | 'similarity') => {
    setSearchMode(currentTab.id, mode);
  };
  
  return (
    <div className="flex items-center border rounded-md bg-background">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('text')}
        className={cn(
          "h-8 px-3 rounded-r-none border-r",
          searchMode === 'text' 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-muted"
        )}
      >
        <Search className="h-4 w-4 mr-1" />
        Text
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleModeChange('similarity')}
        className={cn(
          "h-8 px-3 rounded-l-none",
          searchMode === 'similarity' 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-muted"
        )}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        Similarity
      </Button>
    </div>
  );
}
