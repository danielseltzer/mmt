import { cn } from '@/lib/utils';
import { Search, Filter, Wand2, FileOutput } from 'lucide-react';

type OperationTab = 'search' | 'filter' | 'transform' | 'output';

interface OperationTabsProps {
  activeTab: OperationTab;
  onTabChange: (tab: OperationTab) => void;
}

export function OperationTabs({ activeTab, onTabChange }: OperationTabsProps) {
  const tabs = [
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'filter' as const, label: 'Filter', icon: Filter },
    { id: 'transform' as const, label: 'Transform', icon: Wand2 },
    { id: 'output' as const, label: 'Output', icon: FileOutput },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-md w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-2",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}