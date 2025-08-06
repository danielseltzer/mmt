import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

export interface SortOption {
  id: string;
  label: string;
}

export interface SortConfigProps {
  options: SortOption[];
  currentSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
}

export function SortConfig({ options, currentSort, onSortChange }: SortConfigProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSort = (field: string): void => {
    if (currentSort?.field === field) {
      // Toggle order if same field
      onSortChange(field, currentSort.order === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for new field
      onSortChange(field, 'asc');
    }
    setIsOpen(false);
  };

  const currentOption = options.find(opt => opt.id === currentSort?.field) ?? null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-accent"
        data-testid="sort-config-button"
      >
        {currentSort ? (
          <>
            <span>{currentOption?.label ?? 'Sort'}</span>
            {currentSort.order === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </>
        ) : (
          <>
            <ArrowUpDown className="h-3 w-3" />
            <span>Sort</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-background border rounded-md shadow-lg z-50">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  handleSort(option.id);
                }}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center justify-between"
                data-testid={`sort-option-${option.id}`}
              >
                <span>{option.label}</span>
                {currentSort?.field === option.id && (
                  currentSort.order === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}