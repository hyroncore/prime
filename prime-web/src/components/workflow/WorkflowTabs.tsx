import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TabKey, TABS, WorkflowCounts } from './workflowTypes';

interface WorkflowTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  counts: WorkflowCounts;
}

export function WorkflowTabs({ activeTab, onChange, counts }: WorkflowTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabChange = (tab: TabKey) => {
    onChange(tab);
    setSearchParams({ ...Object.fromEntries(searchParams), tab }, { replace: true });
  };

  return (
    <div className="flex gap-2 border-b border-border mb-6">
      {TABS.map((tab) => {
        const count = counts[tab.key];
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-t-lg',
              isActive
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'px-2 py-0.5 text-[11px] font-bold rounded-full',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}