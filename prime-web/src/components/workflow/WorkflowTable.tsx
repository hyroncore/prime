import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateShort, getUrgencyMeta } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import type { RequisitionDto, RequisitionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TabKey, ACTION_LABELS } from './workflowTypes';

interface WorkflowTableProps {
  items: RequisitionDto[];
  tab: TabKey;
  onAction: (id: number, action: 'approve-review' | 'decline-review' | 'approve-internal' | 'request-revision') => void;
  loading: boolean;
}

const STATUS_ORDER: Record<TabKey, string[]> = {
  review: ['REVIEW'],
  internal: ['SUBMITTED'],
  archive: ['DECLINED', 'APPROVED', 'REVISE'],
};

export function WorkflowTable({ items, tab, onAction, loading }: WorkflowTableProps) {
  const openDrawer = useAppStore((s) => s.openDrawer);

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">المعرف</TableHead>
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">العنوان</TableHead>
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">العميل / المصنع</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">تاريخ الاستحقاق</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">مقدم من</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">الحالة</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-b border-border">
              <TableCell className="px-4 py-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell className="px-4 py-4"><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell className="px-4 py-4"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell className="px-4 py-4 text-center"><div className="h-4 w-20 bg-muted animate-pulse rounded mx-auto" /></TableCell>
              <TableCell className="px-4 py-4 text-center"><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto" /></TableCell>
              <TableCell className="px-4 py-4 text-center"><div className="h-4 w-20 bg-muted animate-pulse rounded mx-auto" /></TableCell>
              <TableCell className="px-4 py-4 text-center"><div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">المعرف</TableHead>
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">العنوان</TableHead>
            <TableHead className="px-4 text-[11px] font-bold text-muted-foreground">العميل / المصنع</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">تاريخ الاستحقاق</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">مقدم من</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">الحالة</TableHead>
            <TableHead className="px-4 text-center text-[11px] font-bold text-muted-foreground">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const statuses = STATUS_ORDER[tab];
            const isOverdue = statuses.includes(row.status as RequisitionStatus) && new Date(row.dueDate) < new Date();
            const daysLeft = Math.ceil((new Date(row.dueDate).getTime() - Date.now()) / 86400000);
            const urgency = getUrgencyMeta(daysLeft);
            return (
              <TableRow
                key={row.id}
                className={cn('border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer', isOverdue && 'bg-red-50/50')}
                onClick={() => openDrawer(row.id)}
              >
                <TableCell className="px-4 py-3">
                  <span dir="ltr" className="font-mono text-sm font-bold text-primary">
                    {row.identifier}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <p className="truncate text-sm font-semibold max-w-[300px]">{row.title}</p>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <p className="text-sm font-medium">{row.clientName}</p>
                  <p className="text-[11px] text-muted-foreground">{row.plantName} [{row.plantShortCode}]</p>
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <p className={cn('text-sm font-bold tabular-nums', isOverdue && 'text-red-700 dark:text-red-400')}>
                    {formatDateShort(row.dueDate)}
                  </p>
                  {statuses.includes(row.status) && (
                    <p className={cn('text-[10px] font-bold', isOverdue ? 'text-red-700 dark:text-red-400' : urgency.className)}>
                      {urgency.label}
                    </p>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-center text-sm text-muted-foreground">
                  —
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <StatusBadge status={row.status as RequisitionStatus} />
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  {ACTION_LABELS['approve-review'] && tab === 'review' && row.status === 'REVIEW' && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAction(row.id, 'approve-review'); }}
                        className="text-xs h-8 px-3"
                      >
                        موافقة
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAction(row.id, 'decline-review'); }}
                        className="text-xs h-8 px-3"
                      >
                        رفض
                      </Button>
                    </div>
                  )}
                  {tab === 'internal' && row.status === 'SUBMITTED' && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAction(row.id, 'approve-internal'); }}
                        className="text-xs h-8 px-3"
                      >
                        اعتماد
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onAction(row.id, 'request-revision'); }}
                        className="text-xs h-8 px-3"
                      >
                        تعديل
                      </Button>
                    </div>
                  )}
                  {tab === 'archive' && (
                    <span className="text-[11px] text-muted-foreground">للاطلاع فقط</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}