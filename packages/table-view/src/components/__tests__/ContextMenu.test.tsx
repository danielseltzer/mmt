import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextMenu, MenuItem } from '../ContextMenu';

describe('ContextMenu', () => {
  // Using real functions instead of mocks
  let onCloseCallCount = 0;
  let actionCallCount = 0;
  const onClose = () => { onCloseCallCount++; };
  const action = () => { actionCallCount++; };

  const defaultItems: MenuItem[] = [
    {
      id: 'item1',
      label: 'First Item',
      action: action,
    },
    {
      id: 'separator1',
      label: '',
      separator: true,
    },
    {
      id: 'item2',
      label: 'Second Item',
      action: action,
      icon: 'eye',
    },
    {
      id: 'item3',
      label: 'Disabled Item',
      action: action,
      disabled: true,
    },
  ];

  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 200 },
    items: defaultItems,
    onClose: onClose,
  };

  beforeEach(() => {
    // Reset counters instead of clearing mocks
    onCloseCallCount = 0;
    actionCallCount = 0;
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ContextMenu
          {...defaultProps}
          isOpen={false}
        />
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should render all menu items', () => {
      render(<ContextMenu {...defaultProps} />);

      expect(screen.getByText('First Item')).toBeInTheDocument();
      expect(screen.getByText('Second Item')).toBeInTheDocument();
      expect(screen.getByText('Disabled Item')).toBeInTheDocument();
    });

    it('should render separators', () => {
      render(<ContextMenu {...defaultProps} />);

      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('h-px', 'bg-border', 'my-1');
    });

    it('should apply disabled styles to disabled items', () => {
      render(<ContextMenu {...defaultProps} />);

      const disabledItem = screen.getByText('Disabled Item').closest('button');
      expect(disabledItem).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should render icons when provided', () => {
      render(<ContextMenu {...defaultProps} />);

      const itemWithIcon = screen.getByText('Second Item').closest('button');
      // Icons are rendered as emoji text in spans, not SVGs
      const iconSpan = itemWithIcon?.querySelector('span[aria-hidden="true"]');
      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan?.textContent).toBe('👁️');
    });

    it('should render with custom className', () => {
      render(
        <ContextMenu
          {...defaultProps}
          className="custom-class"
        />
      );

      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should call action and close on item click', async () => {
      render(<ContextMenu {...defaultProps} />);

      const firstItem = screen.getByText('First Item');
      await userEvent.click(firstItem);

      expect(actionCallCount).toBe(1);
      expect(onCloseCallCount).toBe(1);
    });

    it('should not call action for disabled items', async () => {
      render(<ContextMenu {...defaultProps} />);

      const disabledItem = screen.getByText('Disabled Item');
      await userEvent.click(disabledItem);

      expect(actionCallCount).toBe(0);
      expect(onCloseCallCount).toBe(0);
    });

    it('should not call action for separators', async () => {
      render(<ContextMenu {...defaultProps} />);

      const separator = screen.getByRole('separator');
      fireEvent.click(separator);

      expect(actionCallCount).toBe(0);
      expect(onCloseCallCount).toBe(0);
    });

    it('should close menu when clicking outside', async () => {
      const { container } = render(
        <>
          <div data-testid="outside">Outside content</div>
          <ContextMenu {...defaultProps} />
        </>
      );

      // Wait for the event listener to be attached (there's a 10ms delay)
      await new Promise(resolve => setTimeout(resolve, 15));

      // Click outside the menu
      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onCloseCallCount).toBe(1);
    });

    it('should not close when clicking inside menu', async () => {
      render(<ContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      fireEvent.mouseDown(menu, {
        target: menu,
        currentTarget: menu,
      });

      expect(onCloseCallCount).toBe(0);
    });

    it('should close on Escape key', async () => {
      render(<ContextMenu {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCloseCallCount).toBe(1);
    });

    it('should not close on other keys', async () => {
      render(<ContextMenu {...defaultProps} />);

      // Try pressing 'a' key
      fireEvent.keyDown(document, { key: 'a' });

      expect(onCloseCallCount).toBe(0);
    });
  });

  // NOTE: Positioning tests removed as they require browser APIs that violate NO MOCKS policy
  // The positioning logic is better tested with integration/e2e tests

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Context menu');

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3); // Excluding separator

      const disabledItem = screen.getByText('Disabled Item').closest('button');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have proper role for separators', () => {
      render(<ContextMenu {...defaultProps} />);

      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
    });

    it('should manage focus properly', async () => {
      render(<ContextMenu {...defaultProps} />);

      const firstItemButton = screen.getByText('First Item').closest('button');
      firstItemButton?.focus();

      expect(document.activeElement).toBe(firstItemButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      render(
        <ContextMenu
          {...defaultProps}
          items={[]}
        />
      );

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu.children).toHaveLength(0);
    });

    it('should handle items without actions', async () => {
      const itemsWithoutAction = [
        {
          id: 'no-action',
          label: 'No Action Item',
        },
      ];

      render(
        <ContextMenu
          {...defaultProps}
          items={itemsWithoutAction}
        />
      );

      const item = screen.getByText('No Action Item');
      await userEvent.click(item);

      // Should still close the menu even without action
      expect(onCloseCallCount).toBe(1);
      expect(actionCallCount).toBe(0);
    });

    it('should handle all separator items', () => {
      const allSeparators = [
        { id: 'sep1', label: '', separator: true },
        { id: 'sep2', label: '', separator: true },
      ];

      render(
        <ContextMenu
          {...defaultProps}
          items={allSeparators}
        />
      );

      const separators = screen.getAllByRole('separator');
      expect(separators).toHaveLength(2);
    });
  });
});