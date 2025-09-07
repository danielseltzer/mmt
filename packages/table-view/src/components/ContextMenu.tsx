import React, { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

export interface MenuItem {
  id: string;
  label: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  icon?: string;
}

export interface ContextMenuProps {
  /** Whether the menu is open/visible */
  isOpen: boolean;
  /** Position where the menu should be rendered */
  position: { x: number; y: number };
  /** Menu items to display */
  items: MenuItem[];
  /** Callback when menu should close */
  onClose: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Reusable context menu component
 * Displays a positioned menu with clickable items
 * Handles click outside and keyboard navigation
 */
export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  className,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to prevent immediate close on right-click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Check if menu goes off right edge
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // Check if menu goes off bottom edge
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    // Apply adjusted position if needed
    if (adjustedX !== position.x || adjustedY !== position.y) {
      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [isOpen, position]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled || item.separator) {
      return;
    }

    if (item.action) {
      item.action();
    }
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className={clsx(
        'fixed bg-background border rounded-md shadow-lg py-1 z-50',
        'min-w-[150px] max-w-[300px]',
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item) => {
        if (item.separator) {
          return (
            <div
              key={item.id}
              className="h-px bg-border my-1"
              role="separator"
              aria-orientation="horizontal"
            />
          );
        }

        return (
          <button
            key={item.id}
            role="menuitem"
            className={clsx(
              'w-full px-4 py-2 text-left text-sm transition-colors',
              'flex items-center gap-2',
              item.disabled
                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                : 'hover:bg-muted cursor-pointer',
            )}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            aria-disabled={item.disabled}
          >
            {item.icon && (
              <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                {/* Icon placeholder - can be replaced with actual icon component */}
                {item.icon === 'eye' && '👁️'}
                {item.icon === 'external-link' && '🔗'}
                {item.icon === 'folder-open' && '📂'}
                {item.icon === 'search' && '🔍'}
                {item.icon === 'move' && '📦'}
                {item.icon === 'edit' && '✏️'}
                {item.icon === 'trash' && '🗑️'}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}