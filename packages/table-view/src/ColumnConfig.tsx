import React, { useState, useRef, useEffect } from 'react';
import type { VisibilityState } from '@tanstack/react-table';

interface ColumnConfigProps {
  columns: Array<{ id: string; label: string }>;
  visibility: VisibilityState;
  onVisibilityChange: (visibility: VisibilityState) => void;
}

export function ColumnConfig({ columns, visibility, onVisibilityChange }: ColumnConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (columnId: string) => {
    onVisibilityChange({
      ...visibility,
      [columnId]: !visibility[columnId],
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        data-testid="columns-config-button"
        className="px-3 py-1 text-sm bg-secondary rounded-md hover:bg-secondary/80"
        onClick={() => setIsOpen(!isOpen)}
      >
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg p-2 min-w-[150px] z-50">
          {columns.map((column) => (
            <label
              key={column.id}
              className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibility[column.id] !== false}
                onChange={() => handleToggle(column.id)}
              />
              <span className="text-sm">{column.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}