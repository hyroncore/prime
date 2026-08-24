import { Badge } from '@/components/ui/badge'
import { STATUS_META } from '@/lib/format'
import type { RequisitionStatus } from '@/lib/types'

export function StatusBadge({ status }: { status: RequisitionStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.NEW
  return (
    <Badge variant="outline" className={`rounded-full py-0 ${meta.badgeClass}`}>
      {meta.label}
    </Badge>
  )
}
