import { useState } from 'react';
import { FilterBar } from './FilterBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Filter, Wand2, FileOutput } from 'lucide-react';
import { useDocumentStore } from '../stores/document-store';

// eslint-disable-next-line no-unused-vars
function PanelHeader({ icon: Icon, title, summary, isOpen }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Icon className="h-4 w-4" />
        <span className="font-medium">{title}</span>
      </div>
      {!isOpen && summary && (
        <span className="text-sm text-muted-foreground">{summary}</span>
      )}
    </div>
  );
}

export function PipelinePanels() {
  const [openPanel, setOpenPanel] = useState('select'); // Only one panel open at a time
  const filters = useDocumentStore(state => state.filters);
  
  // Generate filter summary from the active filters
  const getFilterSummary = () => {
    if (!filters || !filters.conditions || filters.conditions.length === 0) {
      return 'No filters applied';
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
        summaryParts.push(`${conditions.length} metadata filter${conditions.length > 1 ? 's' : ''}`);
      } else if (field === 'modified') {
        summaryParts.push('date filter');
      } else if (field === 'size') {
        summaryParts.push('size filter');
      } else if (field === 'name' || field === 'content') {
        summaryParts.push(field);
      }
    });
    
    return summaryParts.length > 0 
      ? `Filters: ${summaryParts.join(', ')}`
      : 'No filters applied';
  };

  return (
    <div className="space-y-2 mb-4">
      {/* SELECT Panel */}
      <Collapsible 
        open={openPanel === 'select'} 
        onOpenChange={(open) => setOpenPanel(open ? 'select' : null)}
        className="border rounded-lg"
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-3 h-auto">
            <PanelHeader
              icon={Filter}
              title="SELECT"
              summary={getFilterSummary()}
              isOpen={openPanel === 'select'}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3">
            <FilterBar />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* TRANSFORM Panel */}
      <Collapsible 
        open={openPanel === 'transform'} 
        onOpenChange={(open) => setOpenPanel(open ? 'transform' : null)}
        className="border rounded-lg"
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-3 h-auto">
            <PanelHeader
              icon={Wand2}
              title="TRANSFORM"
              summary="No operations configured"
              isOpen={openPanel === 'transform'}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3">
            <p className="text-sm text-muted-foreground">Transform operations will be implemented here</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* OUTPUT Panel */}
      <Collapsible 
        open={openPanel === 'output'} 
        onOpenChange={(open) => setOpenPanel(open ? 'output' : null)}
        className="border rounded-lg"
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-3 h-auto">
            <PanelHeader
              icon={FileOutput}
              title="OUTPUT"
              summary="Output: Table view"
              isOpen={openPanel === 'output'}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3">
            <p className="text-sm text-muted-foreground">Output configuration will be implemented here</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}