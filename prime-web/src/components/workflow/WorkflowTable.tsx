import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateShort, getUrgencyMeta } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'
import type { RequisitionDto, RequisitionStatus } from '@/lib/types'
import { TabKey } from './workflowTypes'

interface WorkflowTableProps {
  items: RequisitionDto[]
  tab: TabKey
  onAction: (
    id: number,
    action: 'approve-review' | 'decline-review' | 'approve-internal' | 'request-revision',
  ) => void
  loading: boolean
}

const headers = ['المعرف', 'الطلب', 'تاريخ الاستحقاق', 'الحالة', 'الإجراءات'] as const

export function WorkflowTable({ items, tab, onAction, loading }: WorkflowTableProps) {
  const openDrawer = useAppStore((state) => state.openDrawer)

  if (loading) {
    return (
      <Table className="min-w-[700px]" aria-busy="true">
        <TableCaption className="sr-only">جارٍ تحميل طلبات سير العمل</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header} scope="col">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={header} className="py-4">
                  <Skeleton className="h-4 w-24 rounded" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <Table className="min-w-[700px]">
      <TableCaption className="sr-only">طلبات سير العمل وإجراءاتها</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {headers.map((header) => (
            <TableHead key={header} scope="col">{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((request) => {
          const needsDecision = request.status === 'REVIEW' || request.status === 'SUBMITTED'
          const daysLeft = Math.ceil(
            (new Date(request.dueDate).getTime() - Date.now()) / 86_400_000,
          )
          const isOverdue = needsDecision && daysLeft < 0
          const urgency = getUrgencyMeta(daysLeft)

          return (
            <TableRow key={request.id}>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => openDrawer(request.id)}
                  aria-label={`عرض تفاصيل الطلب ${request.identifier}`}
                  className="h-10 px-2 font-mono text-sm font-bold text-primary focus-visible:ring-2 focus-visible:ring-primary"
                  dir="ltr"
                >
                  {request.identifier}
                </Button>
              </TableCell>
              <TableCell className="max-w-[360px]">
                <p className="truncate text-sm font-semibold">{request.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {request.clientName} · {request.plantName} [{request.plantShortCode}]
                </p>
              </TableCell>
              <TableCell>
                <p className={`text-sm font-semibold tabular-nums ${isOverdue ? 'text-destructive' : ''}`}>
                  {formatDateShort(request.dueDate)}
                </p>
                {needsDecision && (
                  <p className={`mt-0.5 text-xs ${isOverdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                    {urgency.label}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={request.status as RequisitionStatus} />
              </TableCell>
              <TableCell>
                {tab === 'review' && request.status === 'REVIEW' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onAction(request.id, 'approve-review')}
                      className="h-10 text-xs font-semibold"
                    >
                      موافقة
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onAction(request.id, 'decline-review')}
                      className="h-10 text-xs font-semibold"
                    >
                      رفض
                    </Button>
                  </div>
                ) : tab === 'internal' && request.status === 'SUBMITTED' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onAction(request.id, 'approve-internal')}
                      className="h-10 text-xs font-semibold"
                    >
                      اعتماد
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onAction(request.id, 'request-revision')}
                      className="h-10 text-xs font-semibold"
                    >
                      طلب تعديل
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">للاطلاع فقط</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
