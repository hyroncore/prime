import { Button } from '@/components/ui/button';
import { TabKey, EMPTY_MESSAGES } from './workflowTypes';

interface WorkflowEmptyStateProps {
  tab: TabKey;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function WorkflowEmptyState({ tab, hasFilters, onClearFilters }: WorkflowEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-base font-black">{EMPTY_MESSAGES[tab]}</p>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters} className="text-xs font-bold">
          مسح التصفية
        </Button>
      )}
    </div>
  );
}