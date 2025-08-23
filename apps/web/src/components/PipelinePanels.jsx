import { useState, useEffect } from 'react';
import { FilterBar } from './FilterBar';
import { TransformPanel } from './TransformPanel';
import { OutputPanel } from './OutputPanel';
import { PreviewModal } from './PreviewModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Filter, Wand2, FileOutput, Eye } from 'lucide-react';
import { useDocumentStore, useCurrentTab, useActiveFilters, useActiveTotalCount } from '../stores/document-store';

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
  const [operations, setOperations] = useState([]);
  const [outputFormat, setOutputFormat] = useState('json');
  const [showPreview, setShowPreview] = useState(false);
  const [transformJustOpened, setTransformJustOpened] = useState(false);
  const currentTab = useCurrentTab();
  const filters = currentTab?.filters || { conditions: [], logic: 'AND' };
  const documents = currentTab?.documents || [];
  const totalCount = currentTab?.totalCount || 0;
  const searchMode = currentTab?.searchMode || 'text';
  
  // Close panels when search mode changes
  useEffect(() => {
    setOpenPanel(null);
  }, [searchMode]);
  
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
  
  // Generate transform summary from operations
  const getTransformSummary = () => {
    if (operations.length === 0) {
      return 'None';
    }
    
    // Count operations by type
    const opCounts = {};
    operations.forEach(op => {
      const type = op.type === 'updateFrontmatter' ? 'Frontmatter' : 
                   op.type.charAt(0).toUpperCase() + op.type.slice(1);
      opCounts[type] = (opCounts[type] || 0) + 1;
    });
    
    // Format as "Type" or "Type (n)" if more than 1
    return Object.entries(opCounts)
      .map(([type, count]) => count > 1 ? `${type} (${count})` : type)
      .join(', ');
  };

  // Generate output summary
  const getOutputSummary = () => {
    const formatLabels = {
      json: 'JSON',
      yaml: 'YAML',
      csv: 'CSV',
      markdown: 'Markdown'
    };
    return formatLabels[outputFormat] || 'JSON';
  };

  const handleExecute = async () => {
    // TODO: Implement pipeline execution
    console.log('Executing pipeline:', {
      filters,
      operations,
      outputFormat,
      documentCount: totalCount
    });
    
    // This will be implemented in issue #128
    // For now, just close the modal
    setShowPreview(false);
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
      summary: getTransformSummary(),
      content: <TransformPanel 
        operations={operations} 
        onOperationsChange={setOperations}
        justOpened={transformJustOpened}
        onOpenHandled={() => setTransformJustOpened(false)}
      />
    },
    {
      id: 'output',
      icon: FileOutput,
      title: 'Output:',
      summary: getOutputSummary(),
      content: <OutputPanel 
        selectedDocuments={documents} 
        onFormatChange={setOutputFormat}
      />
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
            onOpenChange={(open) => {
              if (open && panel.id === 'transform' && operations.length === 0) {
                setTransformJustOpened(true);
              }
              setOpenPanel(open ? panel.id : null);
            }}
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
        
        {/* Document count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {totalCount} docs
        </span>
        
        {/* Preview button */}
        <Button 
          onClick={() => setShowPreview(true)}
          size="sm"
          className="ml-2"
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>
      
      {/* Expanded panel content below the bar */}
      {openPanel && (
        <div className="mt-2 border rounded-lg p-3">
          {panels.find(p => p.id === openPanel)?.content}
        </div>
      )}
      
      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        filters={filters}
        operations={operations}
        outputFormat={outputFormat}
        documentCount={totalCount}
        onExecute={handleExecute}
      />
    </div>
  );
}