import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, Plus, Loader2 } from 'lucide-react';
import { VaultStatusIndicator } from './VaultStatusIndicator';

export function TabBar() {
  const {
    tabs,
    activeTabId,
    vaults,
    isLoadingVaults,
    createTab,
    switchTab,
    closeTab,
    loadVaults,
  } = useDocumentStore();
  
  console.log('[TabBar] Vaults:', vaults.length, 'Tabs:', tabs.length);

  // Note: loadVaults is already called in App.tsx, so we don't need to call it here
  // This was causing duplicate calls and race conditions

  // Don't show tab bar if no vaults available
  if (!vaults || vaults.length === 0) {
    if (isLoadingVaults) {
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
          const isActive = tab.tabId === activeTabId;

          return (
            <div
              key={tab.tabId}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 cursor-pointer transition-all duration-200",
                "border-t border-l border-r min-w-[140px] max-w-[220px] relative",
                "rounded-t-lg -mb-px",
                isActive
                  ? "bg-background border-border z-10 shadow-sm"
                  : "bg-muted/40 border-muted-foreground/20 hover:bg-muted/60 hover:border-muted-foreground/30"
              )}
              onClick={() => switchTab(tab.tabId)}
              data-testid={`tab-trigger-${tab.vaultId}`}
            >
              {/* Tab content */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={cn(
                  "text-sm truncate",
                  isActive ? "font-medium" : ""
                )}>
                  {tab.tabName}
                </span>
                
                {/* Compact status indicator */}
                <div data-testid={`tab-status-${tab.vaultId}`}>
                  <VaultStatusIndicator 
                    vaultId={tab.vaultId}
                    compact={true}
                    className="ml-auto"
                  />
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
                  onClick={(e) => handleCloseTab(tab.tabId, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Add new tab button with vault picker dropdown */}
        {vaults.some(v => v.status === 'ready') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center cursor-pointer transition-colors",
                  "w-8 h-8 ml-1 rounded-md hover:bg-muted/60",
                  "border border-transparent hover:border-muted-foreground/20"
                )}
                title="Open new vault tab"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {vaults
                .filter(v => v.status === 'ready')
                .map((vault) => (
                  <DropdownMenuItem
                    key={vault.id}
                    onClick={() => handleCreateTab(vault.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{vault.name}</span>
                      {vault.status === 'initializing' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}