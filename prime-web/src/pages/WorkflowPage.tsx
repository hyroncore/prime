import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkflow } from '@/components/workflow/useWorkflow'
import { WorkflowTabs } from '@/components/workflow/WorkflowTabs'
import { WorkflowFilters } from '@/components/workflow/WorkflowFilters'
import { WorkflowTable } from '@/components/workflow/WorkflowTable'
import { WorkflowActionDialog } from '@/components/workflow/WorkflowActionDialog'
import { WorkflowEmptyState } from '@/components/workflow/WorkflowEmptyState'
import { WorkflowPagination } from '@/components/workflow/WorkflowPagination'
import type { WorkflowActionType } from '@/components/workflow/workflowTypes'

export function WorkflowPage() {
  const {
    items,
    counts,
    countsError,
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
    approveManagerReview,
    approveInternal,
    requestRevision,
    refresh,
  } = useWorkflow()

  const [actionDialog, setActionDialog] = useState<{
    type: WorkflowActionType
    id: number
  } | null>(null)

  const handleActionConfirm = async (notes: string) => {
    if (!actionDialog) return
    const { type, id } = actionDialog
    switch (type) {
      case 'approve-review':
        await approveReview(id, notes)
        break
      case 'decline-review':
        await declineReview(id, notes)
        break
      case 'approve-manager-review':
        await approveManagerReview(id, notes)
        break
      case 'approve-internal':
        await approveInternal(id, notes)
        break
      case 'request-revision':
        await requestRevision(id, notes)
        break
    }
  }

  const isFiltered = Object.values(filters).some(
    (value) => value !== null && value !== '',
  )

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">تدفق العمل</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            مراجعة الطلبات واتخاذ الإجراء المناسب
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refresh()}
          disabled={loading}
          aria-busy={loading}
          className="h-11 min-w-24 font-semibold"
        >
          {loading ? 'جارٍ التحديث…' : 'تحديث'}
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void refresh()}
              disabled={loading}
              className="h-11 font-semibold"
            >
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="مرحلة سير العمل" className="space-y-3">
        <WorkflowTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          counts={counts}
        />
        {countsError && (
          <p role="alert" className="text-xs text-destructive">
            تعذر تحميل أعداد الطلبات: {countsError}
          </p>
        )}
      </section>

      <section aria-labelledby="workflow-filters-heading" className="space-y-3">
        <h2 id="workflow-filters-heading" className="text-sm font-black">
          تصفية الطلبات
        </h2>
        <WorkflowFilters
          values={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
      </section>

      <section aria-labelledby="workflow-requests-heading" className="space-y-3">
        <h2 id="workflow-requests-heading" className="text-sm font-black">
          {activeTab === 'review'
            ? 'طلبات مراجعة المدير'
            : activeTab === 'internal'
              ? 'طلبات الاعتماد الداخلي'
              : 'أرشيف الطلبات'}
        </h2>
        <Card className="overflow-hidden shadow-none">
          {items.length > 0 || loading ? (
            <WorkflowTable
              items={items}
              onAction={(id, type) => setActionDialog({ id, type })}
              loading={loading}
            />
          ) : error ? (
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                تعذر تحميل الطلبات. استخدم «إعادة المحاولة» للمتابعة.
              </p>
            </CardContent>
          ) : (
            <WorkflowEmptyState
              tab={activeTab}
              hasFilters={isFiltered}
              onClearFilters={clearFilters}
            />
          )}
          {!loading && !error && total > 0 && (
            <WorkflowPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </section>

      <WorkflowActionDialog
        open={actionDialog !== null}
        onClose={() => setActionDialog(null)}
        onConfirm={handleActionConfirm}
        actionType={actionDialog?.type ?? 'approve-review'}
      />
    </main>
  )
}
