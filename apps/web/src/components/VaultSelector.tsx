import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function VaultSelector() {
  const {
    vaults,
    currentVaultId,
    setCurrentVault,
    loadVaults,
    isLoadingVaults,
  } = useDocumentStore();

  // Load vaults on mount
  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  // Don't show selector if only one vault or no vaults
  if (!vaults || vaults.length <= 1) {
    return null;
  }

  // Show loading state while fetching vaults
  if (isLoadingVaults) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vaults...
      </div>
    );
  }

  const currentVault = vaults.find((v) => v.id === currentVaultId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Vault:</span>
      <Select value={currentVaultId} onValueChange={setCurrentVault}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a vault">
            {currentVault?.name || currentVaultId}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {vaults.map((vault) => (
            <SelectItem
              key={vault.id}
              value={vault.id}
              disabled={vault.status === 'error'}
            >
              <div className="flex items-center gap-2">
                <span>{vault.name}</span>
                {vault.status === 'initializing' && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                {vault.status === 'error' && (
                  <span className="text-xs text-destructive">(Error)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}