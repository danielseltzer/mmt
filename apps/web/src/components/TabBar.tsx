import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Plus, Loader2 } from 'lucide-react';
import { formatDocumentCount } from '@/utils/format-utils';

export function TabBar() {
  const {
    tabs,
    activeTabId,
    vaults,
    loadingVaults,
    createTab,
    switchTab,
    closeTab,
  } = useDocumentStore();
  
  console.log('[TabBar] Vaults:', vaults.length, 'Tabs:', tabs.length);

  // Note: loadVaults is already called in App.tsx, so we don't need to call it here
  // This was causing duplicate calls and race conditions

  // Don't show tab bar if no vaults available
  if (!vaults || vaults.length === 0) {
    if (loadingVaults) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2 py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading vaults...
        </div>
      );
    }
    return null;
  }

  // Only hide tab bar if there's a single vault with single tab
  // With multiple vaults, always show tab bar so users can create tabs for other vaults
  if (vaults.length === 1 && tabs.length <= 1) {
    return null;
  }

  const handleCreateTab = (vaultId: string) => {
    createTab(vaultId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab switch when closing
    
    // Don't close if it's the only tab
    if (tabs.length > 1) {
      closeTab(tabId);
    }
  };

  return (
    <div className="flex items-end border-b bg-muted/20" data-testid="tab-bar">
      {/* Tab list */}
      <div className="flex items-end overflow-x-auto">
        {tabs.map((tab) => {
          const vault = vaults.find(v => v.id === tab.vaultId);
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 cursor-pointer transition-all duration-200",
                "min-w-[140px] max-w-[220px] relative",
                "rounded-t-lg -mb-px",
                isActive
                  ? "bg-background border-2 border-t-2 border-l-2 border-r-2 border-primary z-10 shadow-md ring-2 ring-primary/20"
                  : "bg-muted/40 border border-t border-l border-r border-muted-foreground/20 hover:bg-muted/60 hover:border-muted-foreground/30"
              )}
              onClick={() => switchTab(tab.id)}
              data-testid={`tab-trigger-${tab.vaultId}`}
            >
              {/* Tab content */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={cn(
                  "text-sm truncate",
                  isActive ? "font-medium" : ""
                )}>
                  {tab.name}
                </span>
                
                {/* Status indicator temporarily removed */}
                <div className="text-xs text-muted-foreground">
                  {tab.loading ? 'Loading...' : `${formatDocumentCount(tab.vaultTotal || tab.documents.length)} docs`}
                </div>
              </div>
              
              {/* Close button - only show if more than one tab */}
              {tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive && "opacity-50 hover:opacity-100"
                  )}
                  onClick={(e) => handleCloseTab(tab.id, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Add new tab button - temporarily simplified without dropdown */}
        {vaults.some(v => v.status === 'ready') && vaults.length > 0 && (
          <button
            className={cn(
              "flex items-center justify-center cursor-pointer transition-colors",
              "w-8 h-8 ml-1 rounded-md hover:bg-muted/60",
              "border border-transparent hover:border-muted-foreground/20"
            )}
            title="Open new vault tab"
            onClick={() => {
              // For now, just create a tab for the first ready vault
              const firstReadyVault = vaults.find(v => v.status === 'ready');
              if (firstReadyVault) {
                handleCreateTab(firstReadyVault.id);
              }
            }}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}