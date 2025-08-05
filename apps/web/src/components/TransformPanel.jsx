import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Trash2, FolderOpen, GripVertical, HelpCircle, Plus } from 'lucide-react';
import { useDocumentStore } from '../stores/document-store';
import { expandTemplate, getTemplateVariables } from '../utils/template-utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Component for individual operation rows
function OperationRow({ operation, onUpdate, onRemove, dragHandleProps, autoFocus }) {
  const { documents } = useDocumentStore();
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folderFilter, setFolderFilter] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(operation.targetPath || '');
  const [showRenameHelp, setShowRenameHelp] = useState(false);
  const [showFrontmatterHelp, setShowFrontmatterHelp] = useState(false);
  const renameHelpRef = useRef(null);
  const frontmatterHelpRef = useRef(null);
  const renameInputRef = useRef(null);
  const moveInputRef = useRef(null);
  const frontmatterKeyRef = useRef(null);
  
  // Auto-focus the first input when this is a newly added operation
  useEffect(() => {
    if (autoFocus) {
      if (operation.type === 'rename' && renameInputRef.current) {
        renameInputRef.current.focus();
      } else if (operation.type === 'move' && moveInputRef.current) {
        moveInputRef.current.focus();
      } else if (operation.type === 'updateFrontmatter' && frontmatterKeyRef.current) {
        frontmatterKeyRef.current.focus();
      }
    }
  }, [autoFocus, operation.type]);
  
  // Handle click outside for help tooltips
  useEffect(() => {
    function handleClickOutside(event) {
      if (renameHelpRef.current && !renameHelpRef.current.contains(event.target)) {
        setShowRenameHelp(false);
      }
      if (frontmatterHelpRef.current && !frontmatterHelpRef.current.contains(event.target)) {
        setShowFrontmatterHelp(false);
      }
    }
    
    if (showRenameHelp || showFrontmatterHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRenameHelp, showFrontmatterHelp]);
  
  // Extract unique frontmatter keys from all documents
  const allFrontmatterKeys = [...new Set(
    documents.flatMap(doc => 
      Object.keys(doc.metadata.frontmatter || {})
    )
  )].sort();
  
  // Extract unique folders from documents
  const uniqueFolders = [...new Set(
    documents.map(doc => {
      const path = doc.path;
      const lastSlash = path.lastIndexOf('/');
      return lastSlash > 0 ? path.substring(0, lastSlash) : '/';
    })
  )].sort();
  
  // Filter folders based on user input
  const filteredFolders = uniqueFolders.filter(folder =>
    folder.toLowerCase().includes(folderFilter.toLowerCase())
  );
  
  const handleRenameChange = (value) => {
    onUpdate({ ...operation, pattern: value });
  };
  
  const handleMovePathChange = (value) => {
    setSelectedFolder(value);
    onUpdate({ ...operation, targetPath: value });
  };
  
  const handleFrontmatterKeyChange = (value) => {
    onUpdate({ ...operation, key: value });
  };
  
  const handleFrontmatterValueChange = (value) => {
    onUpdate({ ...operation, value: value });
  };
  
  const selectFolder = (folder) => {
    setSelectedFolder(folder);
    onUpdate({ ...operation, targetPath: folder });
    setShowFolderPicker(false);
    setFolderFilter('');
  };
  
  // Get first document for preview
  const firstDoc = documents[0];
  const previewName = firstDoc ? firstDoc.metadata.name : 'document';
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-l border-r first:border-t bg-background">
      <div {...dragHandleProps} className="cursor-move">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        {operation.type === 'rename' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Rename:</span>
            <Input
              ref={renameInputRef}
              type="text"
              placeholder="Pattern"
              value={operation.pattern || ''}
              onChange={(e) => handleRenameChange(e.target.value)}
              className="w-48 h-7 text-sm"
            />
            {operation.pattern && (
              <span className="text-sm text-muted-foreground">
                → {expandTemplate(operation.pattern, previewName)}
              </span>
            )}
            <div className="relative ml-auto" ref={renameHelpRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowRenameHelp(!showRenameHelp)}
              >
                <HelpCircle className="h-3 w-3" />
              </Button>
              {showRenameHelp && (
                <div className="absolute right-0 top-full mt-1 p-2 bg-popover border rounded-md shadow-md z-50 whitespace-nowrap">
                  <p className="text-xs">Available variables:</p>
                  <p className="text-xs font-mono">{getTemplateVariables().join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {operation.type === 'move' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Move to:</span>
            <div className="flex-1 relative">
              <div className="flex gap-1">
                <Input
                  ref={moveInputRef}
                  type="text"
                  placeholder="Select or type folder path"
                  value={selectedFolder}
                  onChange={(e) => handleMovePathChange(e.target.value)}
                  className="flex-1 h-7 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowFolderPicker(!showFolderPicker)}
                >
                  <FolderOpen className="h-3 w-3" />
                </Button>
              </div>
              
              {showFolderPicker && (
                <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b">
                    <Input
                      type="text"
                      placeholder="Filter folders..."
                      value={folderFilter}
                      onChange={(e) => setFolderFilter(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <div className="py-1">
                    {filteredFolders.map(folder => (
                      <button
                        key={folder}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => selectFolder(folder)}
                      >
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {operation.type === 'delete' && (
          <div className="flex items-center">
            <span className="text-sm font-medium">Delete</span>
          </div>
        )}
        
        {operation.type === 'updateFrontmatter' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Frontmatter:</span>
            <div className="flex-1 flex gap-2">
              <Input
                ref={frontmatterKeyRef}
                type="text"
                placeholder="Key"
                value={operation.key || ''}
                onChange={(e) => handleFrontmatterKeyChange(e.target.value)}
                className="w-32 h-7 text-sm"
                list="frontmatter-keys"
              />
              <datalist id="frontmatter-keys">
                {allFrontmatterKeys.map(key => (
                  <option key={key} value={key} />
                ))}
              </datalist>
              <span className="text-muted-foreground">=</span>
              <Input
                type="text"
                placeholder="Value (empty to remove)"
                value={operation.value || ''}
                onChange={(e) => handleFrontmatterValueChange(e.target.value)}
                className="w-48 h-7 text-sm"
              />
              {operation.value && (
                <span className="text-sm text-muted-foreground">
                  → {expandTemplate(operation.value, previewName)}
                </span>
              )}
              <div className="relative ml-auto" ref={frontmatterHelpRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowFrontmatterHelp(!showFrontmatterHelp)}
                >
                  <HelpCircle className="h-3 w-3" />
                </Button>
                {showFrontmatterHelp && (
                  <div className="absolute right-0 top-full mt-1 p-2 bg-popover border rounded-md shadow-md z-50 whitespace-nowrap">
                    <p className="text-xs">Available variables:</p>
                    <p className="text-xs font-mono">{getTemplateVariables().join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0 h-7 w-7"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Sortable wrapper for operation rows
function SortableOperationRow({ operation, onUpdate, onRemove, autoFocus }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: operation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OperationRow
        operation={operation}
        onUpdate={onUpdate}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        autoFocus={autoFocus}
      />
    </div>
  );
}

export function TransformPanel({ operations = [], onOperationsChange, justOpened, onOpenHandled }) {
  const [localOperations, setLocalOperations] = useState(operations);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [justAddedOperation, setJustAddedOperation] = useState(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useEffect(() => {
    setLocalOperations(operations);
  }, [operations]);
  
  // Auto-open dropdown when panel is opened with no operations
  useEffect(() => {
    if (justOpened && localOperations.length === 0) {
      setShowAddDropdown(true);
      if (onOpenHandled) {
        onOpenHandled();
      }
    }
  }, [justOpened, localOperations.length, onOpenHandled]);
  
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localOperations.findIndex(op => op.id === active.id);
      const newIndex = localOperations.findIndex(op => op.id === over.id);
      
      const updated = arrayMove(localOperations, oldIndex, newIndex);
      setLocalOperations(updated);
      onOperationsChange(updated);
    }
  };
  
  const addOperation = (type) => {
    const newOperation = {
      id: Date.now().toString(),
      type
    };
    
    const updated = [...localOperations, newOperation];
    setLocalOperations(updated);
    onOperationsChange(updated);
    setShowAddDropdown(false);
    setJustAddedOperation(newOperation.id);
  };
  
  const updateOperation = (id, updatedOp) => {
    const updated = localOperations.map(op => 
      op.id === id ? updatedOp : op
    );
    setLocalOperations(updated);
    onOperationsChange(updated);
  };
  
  const removeOperation = (id) => {
    const updated = localOperations.filter(op => op.id !== id);
    setLocalOperations(updated);
    onOperationsChange(updated);
  };
  
  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localOperations.map(op => op.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="border-t">
            {localOperations.map(operation => (
              <SortableOperationRow
                key={operation.id}
                operation={operation}
                onUpdate={(updated) => updateOperation(operation.id, updated)}
                onRemove={() => removeOperation(operation.id)}
                autoFocus={operation.id === justAddedOperation}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="flex justify-start mt-2">
        <Select open={showAddDropdown} onOpenChange={setShowAddDropdown} onValueChange={addOperation}>
          <SelectTrigger className="w-auto h-7 px-2">
            <Plus className="h-3 w-3" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rename">Rename</SelectItem>
            <SelectItem value="move">Move</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="updateFrontmatter">Update Frontmatter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}