import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import type { RequisitionDto } from '@/lib/types'

const DOC_FONT = '"Cascadia Code"'

export function RequisitionPrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requisitionId = Number(id)

  const [requisition, setRequisition] = useState<RequisitionDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(requisitionId)) {
      setError('طلب غير صالح')
      return
    }
    api.requisitions
      .detail(requisitionId)
      .then(setRequisition)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الطلب'))
  }, [requisitionId])

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm font-black">{error}</p>
        <Button
          onClick={() => navigate('/requisitions')}
          className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
        >
          العودة لقائمة الطلبات
        </Button>
      </div>
    )
  }

  if (!requisition) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const cells = [
    { label: 'العميل', value: requisition.clientName },
    { label: 'المصنع', value: `${requisition.plantName} [${requisition.plantShortCode}]` },
    { label: 'القسم', value: requisition.sectorName },
    { label: 'المرجع الخارجي', value: requisition.externalRef },
    { label: 'تاريخ استلام الطلب', value: formatDate(requisition.receivedAt) },
    { label: 'تاريخ الاستحقاق', value: formatDate(requisition.dueDate) },
    { label: 'تاريخ الإنشاء', value: formatDate(requisition.createdAt) },
  ]

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-2xl print:px-10 print:pt-10 print:pb-16"
      style={{ fontFamily: DOC_FONT }}
    >
      <div className="mb-8 flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground">
          معاينة المختصر — ستفتح نافذة الطباعة عند الضغط على طباعة
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.print()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            طباعة
          </Button>
          <button
            onClick={() => navigate(`/requisitions/${requisitionId}`)}
            className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            رجوع ←
          </button>
        </div>
      </div>

      <header className="mb-5 flex items-center justify-between border-b border-black/50 pb-3">
        <div className="text-start">
          <p className="text-sm text-black">مختصر طلب شراء</p>
          <p dir="ltr" className="mt-0.5 text-[10px] text-black">{requisition.identifier}</p>
        </div>
        <p className="text-xs text-black">Prime</p>
      </header>

      <div className="border-s border-t border-black/50">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {cells.map((cell) => (
            <div
              key={cell.label}
              className="border-e border-b border-black/50 px-3 py-2"
            >
              <p className="text-[10px] text-black">{cell.label}</p>
              <p
                dir={/^[A-Za-z0-9-]+$/.test(cell.value) ? 'ltr' : undefined}
                className="mt-0.5 text-[11px] text-black text-start"
              >
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        <div className="border-e border-b border-black/50 px-3 py-2">
          <p className="text-[10px] text-black">عنوان الطلب</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-black">{requisition.title}</p>
        </div>

        {requisition.clientNotes && (
          <div className="border-e border-b border-black/50 px-3 py-2">
            <p className="text-[10px] text-black">ملاحظات العميل</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-black">
              {requisition.clientNotes}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-8 flex justify-end">
        <div className="text-start">
          <p className="text-[10px] text-black">تاريخ الإصدار</p>
          <p className="mt-0.5 text-[11px] tabular-nums text-black">
            {formatDate(requisition.createdAt)}
          </p>
        </div>
      </footer>

      <p className="mt-6 text-[10px] text-muted-foreground print:hidden">
        وثيقة مختصرة صادرة عن نظام Prime — تم توليدها في {formatDateTime(new Date().toISOString())}
      </p>
    </div>
  )
}