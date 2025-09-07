import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabBar } from '../src/components/TabBar';
import { StatusBar } from '../src/components/StatusBar';
import { useDocumentStore } from '@/stores/document-store';

/**
 * Document Count Display Tests
 * 
 * These tests verify that the UI components correctly display the full vault document count
 * from the API's `total` field, not just the limited documents array length (500 limit).
 * 
 * Following TDD approach - these tests should initially fail, then pass after implementation fixes.
 */
describe('Document Count Display', () => {
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

  describe('TabBar Document Count Display', () => {
    it('should display full vault count from API total field, not limited documents array length', async () => {
      // GIVEN: API response has total: 5992 but only 500 documents in array (pagination limit)
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Personal',
            documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }), // Limited to 500
            vaultTotal: 5992, // Full count from API's total field
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Personal', status: 'ready' },
          { id: 'vault-2', name: 'Work', status: 'ready' } // Need 2+ vaults to show tab bar
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

      // THEN: Tab should display "5.9k docs" from vaultTotal, not "500 docs" from documents.length
      const tabElement = screen.getByTestId('tab-trigger-vault-1');
      expect(tabElement).toHaveTextContent('5.9k docs');
      expect(tabElement).not.toHaveTextContent('500 docs');
    });

    it('should display full count for multiple tabs with different totals', async () => {
      // GIVEN: Multiple vaults with different total counts
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Personal',
            documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
            vaultTotal: 5992, // Should display as "5.9k"
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-2',
            vaultId: 'vault-2',
            name: 'Work',
            documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
            vaultTotal: 1250, // Should display as "1.2k"
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          },
          {
            id: 'tab-3',
            vaultId: 'vault-3',
            name: 'Archive',
            documents: new Array(300).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
            vaultTotal: 300, // Should display as "300" (no k suffix)
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Personal', status: 'ready' },
          { id: 'vault-2', name: 'Work', status: 'ready' },
          { id: 'vault-3', name: 'Archive', status: 'ready' }
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

      // THEN: Each tab should display its correct formatted total
      const personalTab = screen.getByTestId('tab-trigger-vault-1');
      const workTab = screen.getByTestId('tab-trigger-vault-2');
      const archiveTab = screen.getByTestId('tab-trigger-vault-3');

      expect(personalTab).toHaveTextContent('5.9k docs');
      expect(workTab).toHaveTextContent('1.2k docs');
      expect(archiveTab).toHaveTextContent('300 docs');
    });

    it('should fall back to documents.length when vaultTotal is not available', async () => {
      // GIVEN: Tab without vaultTotal (failed API response)
      const mockState = {
        tabs: [
          {
            id: 'tab-1',
            vaultId: 'vault-1',
            name: 'Personal',
            documents: new Array(250).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
            // vaultTotal: undefined, // Missing total from API
            loading: false,
            searchQuery: '',
            searchMode: 'text' as const,
            error: null
          }
        ],
        activeTabId: 'tab-1',
        vaults: [
          { id: 'vault-1', name: 'Personal', status: 'ready' },
          { id: 'vault-2', name: 'Work', status: 'ready' }
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

      // THEN: Should fall back to documents.length
      const tabElement = screen.getByTestId('tab-trigger-vault-1');
      expect(tabElement).toHaveTextContent('250 docs');
    });
  });

  describe('StatusBar Document Count Display', () => {
    it('should display full vault count from API total field in status bar', async () => {
      // GIVEN: API response has total: 5992 but only 500 documents in array
      const mockGetActiveTab = () => ({
        id: 'tab-1',
        vaultId: 'vault-1',
        name: 'Personal',
        documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
        vaultTotal: 5992, // Full count from API
        loading: false,
        searchQuery: '',
        searchMode: 'text' as const,
        error: null
      });

      const mockState = {
        tabs: [mockGetActiveTab()],
        activeTabId: 'tab-1',
        vaults: [{ id: 'vault-1', name: 'Personal', status: 'ready' }],
        loadingVaults: false,
        getActiveTab: mockGetActiveTab
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the StatusBar
      await act(async () => {
        render(<StatusBar />);
      });

      // THEN: Should display "Documents: 5992" from vaultTotal, not "Documents: 500" from documents.length
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toHaveTextContent('Documents: 5992');
      expect(statusBar).not.toHaveTextContent('Documents: 500');
    });

    it('should display full count with proper formatting in status bar', async () => {
      // GIVEN: Large vault count that should be formatted
      const mockGetActiveTab = () => ({
        id: 'tab-1',
        vaultId: 'vault-1',
        name: 'Personal',
        documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
        vaultTotal: 12345,
        loading: false,
        searchQuery: '',
        searchMode: 'text' as const,
        error: null
      });

      const mockState = {
        tabs: [mockGetActiveTab()],
        activeTabId: 'tab-1',
        vaults: [{ id: 'vault-1', name: 'Personal', status: 'ready' }],
        loadingVaults: false,
        getActiveTab: mockGetActiveTab
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the StatusBar
      await act(async () => {
        render(<StatusBar />);
      });

      // THEN: Should display full count (status bar shows raw numbers, not formatted)
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toHaveTextContent('Documents: 12345');
    });

    it('should fall back to documents.length when vaultTotal is not available', async () => {
      // GIVEN: Tab without vaultTotal
      const mockGetActiveTab = () => ({
        id: 'tab-1',
        vaultId: 'vault-1',
        name: 'Personal',
        documents: new Array(300).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
        // vaultTotal: undefined, // Missing total from API
        loading: false,
        searchQuery: '',
        searchMode: 'text' as const,
        error: null
      });

      const mockState = {
        tabs: [mockGetActiveTab()],
        activeTabId: 'tab-1',
        vaults: [{ id: 'vault-1', name: 'Personal', status: 'ready' }],
        loadingVaults: false,
        getActiveTab: mockGetActiveTab
      };

      useDocumentStore.setState(mockState);

      // WHEN: Rendering the StatusBar
      await act(async () => {
        render(<StatusBar />);
      });

      // THEN: Should fall back to documents.length
      const statusBar = screen.getByTestId('status-bar');
      expect(statusBar).toHaveTextContent('Documents: 300');
    });
  });

  describe('FormatDocumentCount Utility Integration', () => {
    it('should use formatDocumentCount utility for tab display', async () => {
      // This test ensures the formatDocumentCount utility is being used correctly
      const testCases = [
        { total: 999, expected: '999 docs' },
        { total: 1000, expected: '1.0k docs' },
        { total: 1950, expected: '1.9k docs' },
        { total: 5992, expected: '5.9k docs' },
        { total: 12345, expected: '12.3k docs' }
      ];

      for (const testCase of testCases) {
        const mockState = {
          tabs: [
            {
              id: 'tab-1',
              vaultId: 'vault-1',
              name: 'Test Vault',
              documents: new Array(500).fill({ path: 'test.md', fullPath: '/test.md', metadata: {} }),
              vaultTotal: testCase.total,
              loading: false,
              searchQuery: '',
              searchMode: 'text' as const,
              error: null
            }
          ],
          activeTabId: 'tab-1',
          vaults: [
            { id: 'vault-1', name: 'Test Vault', status: 'ready' },
            { id: 'vault-2', name: 'Other', status: 'ready' }
          ],
          loadingVaults: false,
          createTab: () => {},
          switchTab: () => {},
          closeTab: () => {}
        };

        useDocumentStore.setState(mockState);

        // WHEN: Rendering the TabBar
        const { unmount } = render(<TabBar />);

        // THEN: Should display correctly formatted count
        const tabElement = screen.getByTestId('tab-trigger-vault-1');
        expect(tabElement).toHaveTextContent(testCase.expected);

        unmount();
      }
    });
  });
});