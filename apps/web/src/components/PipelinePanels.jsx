import { useState } from 'react';
import { FilterBar } from './FilterBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Filter, Wand2, FileOutput } from 'lucide-react';
import { useDocumentStore } from '../stores/document-store';

// eslint-disable-next-line no-unused-vars
function PanelHeader({ icon: Icon, title, summary, isOpen }) {
  return (
    <div className="flex items-center gap-2 w-full">
      {isOpen ? (
        <ChevronDown className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium text-sm">{title}</span>
      {!isOpen && summary && (
        <span className="text-xs text-muted-foreground truncate ml-1">
          {summary}
        </span>
      )}
    </div>
  );
}

export function PipelinePanels({ searchBar }) {
  const [openPanel, setOpenPanel] = useState('select'); // Only one panel open at a time
  const filters = useDocumentStore(state => state.filters);
  
  // Generate filter summary from the active filters
  const getFilterSummary = () => {
    if (!filters || !filters.conditions || filters.conditions.length === 0) {
      return 'All';
    }
    
    const summaryParts = [];
    const conditionsByField = {};
    
    // Group conditions by field
    filters.conditions.forEach(condition => {
      if (!conditionsByField[condition.field]) {
        conditionsByField[condition.field] = [];
      }
      conditionsByField[condition.field].push(condition);
    });
    
    // Create summary for each field
    Object.entries(conditionsByField).forEach(([field, conditions]) => {
      if (field === 'folders' && conditions[0]?.value?.length > 0) {
        const folderCount = conditions[0].value.length;
        summaryParts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
      } else if (field === 'metadata') {
        summaryParts.push(`${conditions.length} metadata`);
      } else if (field === 'modified') {
        summaryParts.push('date');
      } else if (field === 'size') {
        summaryParts.push('size');
      } else if (field === 'name' || field === 'content') {
        summaryParts.push(field);
      }
    });
    
    return summaryParts.join(', ');
  };

  const panels = [
    {
      id: 'select',
      icon: Filter,
      title: 'Select:',
      summary: getFilterSummary(),
      content: <FilterBar />
    },
    {
      id: 'transform',
      icon: Wand2,
      title: 'Transform:',
      summary: 'None',
      content: <p className="text-sm text-muted-foreground">Transform operations will be implemented here</p>
    },
    {
      id: 'output',
      icon: FileOutput,
      title: 'Output:',
      summary: 'Table view',
      content: <p className="text-sm text-muted-foreground">Output configuration will be implemented here</p>
    }
  ];

  return (
    <div className="mb-4">
      {/* Horizontal panel bar */}
      <div className="flex gap-2 items-center">
        {panels.map(panel => (
          <Collapsible 
            key={panel.id}
            open={openPanel === panel.id} 
            onOpenChange={(open) => setOpenPanel(open ? panel.id : null)}
            className="flex-1 border rounded-lg"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-9">
                <PanelHeader
                  icon={panel.icon}
                  title={panel.title}
                  summary={panel.summary}
                  isOpen={openPanel === panel.id}
                />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        ))}
        
        {/* Search bar on the same line */}
        {searchBar}
      </div>
      
      {/* Expanded panel content below the bar */}
      {openPanel && (
        <div className="mt-2 border rounded-lg p-3">
          {panels.find(p => p.id === openPanel)?.content}
        </div>
      )}
    </div>
  );
}