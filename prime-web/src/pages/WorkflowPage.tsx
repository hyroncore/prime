import { useState } from 'react';
import { useWorkflow } from '@/components/workflow/useWorkflow';
import { WorkflowTabs } from '@/components/workflow/WorkflowTabs';
import { WorkflowFilters } from '@/components/workflow/WorkflowFilters';
import { WorkflowTable } from '@/components/workflow/WorkflowTable';
import { WorkflowActionDialog } from '@/components/workflow/WorkflowActionDialog';
import { WorkflowEmptyState } from '@/components/workflow/WorkflowEmptyState';
import { WorkflowPagination } from '@/components/workflow/WorkflowPagination';
import { WorkflowActionType } from '@/components/workflow/workflowTypes';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function WorkflowPage() {
  const {
    items,
    counts,
    total,
    page,
    pageSize,
    loading,
    error,
    activeTab,
    filters,
    setActiveTab,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    approveReview,
    declineReview,
    approveInternal,
    requestRevision,
    refresh,
  } = useWorkflow();

  const { toast } = useToast();
  const [actionDialog, setActionDialog] = useState<{ type: WorkflowActionType; id: number } | null>(null);

  const handleActionClick = (id: number, type: WorkflowActionType) => {
    setActionDialog({ type, id });
  };

  const handleActionConfirm = async (notes: string) => {
    if (!actionDialog) return;
    const { type, id } = actionDialog;
    try {
      switch (type) {
        case 'approve-review':
          await approveReview(id, notes);
          break;
        case 'decline-review':
          await declineReview(id, notes);
          break;
        case 'approve-internal':
          await approveInternal(id, notes);
          break;
        case 'request-revision':
          await requestRevision(id, notes);
          break;
      }
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'فشل الإجراء',
        variant: 'destructive',
      });
      throw e;
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">تدفق العمل</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة طلبات المراجعة والاعتماد الداخلي للفريق
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="text-xs font-bold"
        >
          تحديث
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={refresh} className="text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      <WorkflowTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />

      <WorkflowFilters values={filters} onChange={setFilters} onClear={clearFilters} />

      <WorkflowTable
        items={items}
        tab={activeTab}
        onAction={handleActionClick}
        loading={loading}
      />

      {items.length === 0 && (
        <WorkflowEmptyState
          tab={activeTab}
          hasFilters={Object.values(filters).some(v => v != null && v !== '')}
          onClearFilters={clearFilters}
        />
      )}

      <WorkflowPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <WorkflowActionDialog
        open={!!actionDialog}
        onClose={() => setActionDialog(null)}
        onConfirm={handleActionConfirm}
        actionType={actionDialog?.type ?? 'approve-review'}
      />
    </div>
  );
}