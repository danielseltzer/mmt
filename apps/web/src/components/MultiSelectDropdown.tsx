import { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

export function MultiSelectDropdown({
  items,
  selectedItems,
  onSelectionChange,
  placeholder,
  getItemLabel = (item) => item,
  getItemValue = (item) => item,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => 
      getItemLabel(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery, getItemLabel]);
  
  const handleSelectAll = () => {
    onSelectionChange(items.map(getItemValue));
  };
  
  const handleDeselectAll = () => {
    onSelectionChange([]);
  };
  
  const handleToggleItem = (itemValue) => {
    if (selectedItems.includes(itemValue)) {
      onSelectionChange(selectedItems.filter(v => v !== itemValue));
    } else {
      onSelectionChange([...selectedItems, itemValue]);
    }
  };
  
  const getButtonLabel = () => {
    if (!selectedItems.length) return placeholder;
    if (selectedItems.length === 1) {
      const item = items.find(i => getItemValue(i) === selectedItems[0]);
      return item ? getItemLabel(item) : placeholder;
    }
    return `${selectedItems.length} selected`;
  };
  
  const getTooltip = () => {
    return selectedItems
      .map(value => {
        const item = items.find(i => getItemValue(i) === value);
        return item ? getItemLabel(item) : value;
      })
      .join('\n');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-sm"
          title={selectedItems.length > 0 ? getTooltip() : ''}
        >
          {getButtonLabel()}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2">
        <div className="space-y-2">
          {/* Search */}
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
            autoFocus
          />
          
          {/* Select/Deselect All */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>
          
          {/* Items */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const value = getItemValue(item);
                const label = getItemLabel(item);
                const isSelected = selectedItems.includes(value);
                
                return (
                  <div
                    key={value}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleToggleItem(value)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleItem(value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm flex-1 truncate" title={label}>
                      {label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Apply button */}
          <Button
            size="sm"
            className="w-full h-8"
            onClick={() => setIsOpen(false)}
          >
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}