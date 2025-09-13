import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabBar } from '../src/components/TabBar';
import { useDocumentStore } from '@/stores/document-store';

describe('TabBar Active Tab Highlighting', () => {
  let originalStore: any;

  beforeEach(() => {
    // Save original store state
    originalStore = useDocumentStore.getState();
    // Prevent API calls during tests
    useDocumentStore.setState({
      loadVaults: async () => {},
      loadDocuments: async () => {},
    });
  });

  afterEach(() => {
    // Reset store to original state
    useDocumentStore.setState(originalStore);
  });

  describe('Visual distinction between active and inactive tabs', () => {
    it('should apply distinct background color to active tab', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Active tab should have distinct background class
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Active tab should have bg-background class (white/light background)
      expect(activeTab.className).toContain('bg-background');
      expect(activeTab.className).not.toContain('bg-muted');

      // Inactive tab should have bg-muted class (gray background)
      expect(inactiveTab.className).toContain('bg-muted');
      expect(inactiveTab.className).not.toContain('bg-background');
    });

    it('should apply distinct border styling to active tab', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Active tab should have stronger border
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Active tab should have border-primary class (stronger border)
      expect(activeTab.className).toContain('border-primary');
      
      // Inactive tab should have border-muted-foreground/20 (lighter border)
      expect(inactiveTab.className).toContain('border-muted-foreground/20');
    });

    it('should apply thicker border (border-2) to active tab for prominence', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Active tab should have thicker border
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Active tab should have border-2 class (thicker 2px border)
      expect(activeTab.className).toContain('border-2');
      
      // Active tab should have ring classes for extra prominence
      expect(activeTab.className).toContain('ring-2');
      expect(activeTab.className).toContain('ring-primary/20');
      
      // Inactive tab should have standard border (no border-2)
      expect(inactiveTab.className).not.toContain('border-2');
      expect(inactiveTab.className).not.toContain('ring-2');
    });

    it('should apply elevation (z-index and shadow) to active tab', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Active tab should have elevation styles
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Active tab should have z-10 and shadow-md for elevation
      expect(activeTab.className).toContain('z-10');
      expect(activeTab.className).toContain('shadow-md');

      // Inactive tab should not have these elevation styles
      expect(inactiveTab.className).not.toContain('z-10');
      expect(inactiveTab.className).not.toContain('shadow-md');
    });

    it('should apply font weight to active tab text', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Active tab text should have font-medium class
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Find the text spans within the tabs
      const activeTabText = activeTab.querySelector('.text-sm');
      const inactiveTabText = inactiveTab.querySelector('.text-sm');

      // Active tab text should have font-medium
      expect(activeTabText?.className).toContain('font-medium');

      // Inactive tab text should not have font-medium
      expect(inactiveTabText?.className).not.toContain('font-medium');
    });

    it('should update visual highlighting when switching tabs', async () => {
      // GIVEN: Multiple tabs with tab-1 initially active
      let currentActiveId = 'tab-1';
      const mockSwitchTab = (tabId: string) => {
        currentActiveId = tabId;
        // Update the store to reflect the new active tab
        useDocumentStore.setState({ activeTabId: tabId });
      };

      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: currentActiveId,
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: mockSwitchTab,
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      const { rerender } = render(<TabBar />);

      // THEN: Initially tab-1 should be active
      let tab1 = screen.getByTestId('tab-trigger-vault-1');
      let tab2 = screen.getByTestId('tab-trigger-vault-2');

      expect(tab1.className).toContain('bg-background');
      expect(tab2.className).toContain('bg-muted');

      // WHEN: Clicking on tab-2 to switch
      await act(async () => {
        fireEvent.click(tab2);
      });

      // Force a re-render to reflect the state change
      rerender(<TabBar />);

      // THEN: tab-2 should now be active and tab-1 inactive
      tab1 = screen.getByTestId('tab-trigger-vault-1');
      tab2 = screen.getByTestId('tab-trigger-vault-2');

      expect(tab2.className).toContain('bg-background');
      expect(tab1.className).toContain('bg-muted');
    });

    it('should show hover state only on inactive tabs', async () => {
      // GIVEN: Multiple tabs with one active
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Vault 1',
            documents: [],
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Vault 2',
            documents: [],
            vaultTotal: 200,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Vault 1', status: 'ready' },
          { id: 'vault-2', name: 'Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the TabBar
      await act(async () => {
        render(<TabBar />);
      });

      // THEN: Inactive tab should have hover classes
      const inactiveTab = screen.getByTestId('tab-trigger-vault-2');

      // Inactive tab should have hover state classes
      expect(inactiveTab.className).toContain('hover:bg-muted/60');
      expect(inactiveTab.className).toContain('hover:border-muted-foreground/30');

      // Active tab should not have hover classes (it's already highlighted)
      const activeTab = screen.getByTestId('tab-trigger-vault-1');
      expect(activeTab.className).not.toContain('hover:bg-muted');
    });
  });

  describe('Document count formatting', () => {
    it('should display full document count when <= 999', () => {
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Test Vault',
            documents: new Array(500).fill({}),
            vaultTotal: 500,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Test Vault 2',
            documents: new Array(100).fill({}),
            vaultTotal: 100,
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Test Vault', status: 'ready' },
          { id: 'vault-2', name: 'Test Vault 2', status: 'ready' }
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      const { getByTestId } = render(<TabBar />);
      const tabElement = getByTestId('tab-trigger-vault-1');
      
      // Should show "500 docs" not limited to 500
      expect(tabElement).toHaveTextContent('500 docs');
    });

    it('should display count as "1.0k" when exactly 1000', () => {
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Test Vault',
            documents: new Array(500).fill({}), // Limited to 500
            vaultTotal: 1000, // But vault has 1000 total
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Test Vault', status: 'ready' },
          { id: 'vault-2', name: 'Test Vault 2', status: 'ready' } // Need 2 vaults to show tab bar
        ],
        loadingVaults: false,
        createTab: () => {},
        switchTab: () => {},
        closeTab: () => {}
      };

      useDocumentStore.setState(mockState);

      const { getByTestId } = render(<TabBar />);
      const tabElement = getByTestId('tab-trigger-vault-1');
      
      // Should show "1.0k docs"
      expect(tabElement).toHaveTextContent('1.0k docs');
    });
  });
});