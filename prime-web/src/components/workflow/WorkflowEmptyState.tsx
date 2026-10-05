import { Button } from '@/components/ui/button'
import { EMPTY_MESSAGES, type TabKey } from './workflowTypes'

interface WorkflowEmptyStateProps {
  tab: TabKey;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function WorkflowEmptyState({ tab, hasFilters, onClearFilters }: WorkflowEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h3 className="text-sm font-bold">{EMPTY_MESSAGES[tab]}</h3>
      <p className="max-w-md text-xs text-muted-foreground">
        {hasFilters
          ? 'لا توجد طلبات تطابق عوامل التصفية الحالية.'
          : 'ستظهر الطلبات هنا عند انتقالها إلى هذه المرحلة.'}
      </p>
      {hasFilters && (
        <Button type="button" variant="ghost" onClick={onClearFilters} className="h-11 text-xs font-semibold">
          مسح عوامل التصفية
        </Button>
      )}
    </div>
  );
}