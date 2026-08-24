import { useNavigate } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/StatusBadge'
import { api } from '@/lib/api'
import {
  AUDIT_ACTION_META,
  formatBytes,
  formatDate,
  formatDateTime,
  STATUS_META,
} from '@/lib/format'
import type { RequisitionStatus } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

export function RequisitionDrawer() {
  const navigate = useNavigate()
  const open = useAppStore((s) => s.drawerOpen)
  const close = useAppStore((s) => s.closeDrawer)
  const requisition = useAppStore((s) => s.activeRequisition)

  if (!requisition) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-2xl overflow-y-auto no-scrollbar"
        dir="rtl"
      >
        <SheetHeader className="px-6 pt-6 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle
                dir="ltr"
                className="text-right font-mono text-2xl font-black tracking-tight"
              >
                {requisition.identifier}
              </SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {requisition.clientName} · {requisition.plantName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => navigate(`/requisitions/${requisition.id}/print`)}
                className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                طباعة
              </button>
              <StatusBadge status={requisition.status} />
            </div>
          </div>
          <button
            onClick={() => {
              close()
              navigate(`/requisitions/${requisition.id}`)
            }}
            className="mt-3 self-start text-xs font-bold text-primary transition-colors hover:underline"
          >
            فتح الصفحة الكاملة للطلب ←
          </button>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="المعرف" value={requisition.identifier} />
            <Field label="المرجع الخارجي" value={requisition.externalRef} />
            <Field label="تاريخ الاستلام" value={formatDate(requisition.receivedAt)} />
            <Field label="تاريخ الاستحقاق" value={formatDate(requisition.dueDate)} />
            <Field label="المصنع" value={`${requisition.plantName} [${requisition.plantShortCode}]`} />
            <Field
              label="القسم"
              value={`${requisition.sectorCode} - ${requisition.sectorName}`}
            />
            <Field label="تاريخ الإنشاء" value={formatDate(requisition.createdAt)} />
            <Field label="العميل" value={requisition.clientName} />
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-xs font-bold text-muted-foreground tracking-wide">عنوان الطلب</p>
            <p className="text-sm font-bold leading-relaxed">{requisition.title}</p>
          </div>

          {requisition.clientNotes && (
            <div>
              <p className="mb-3 text-xs font-bold text-muted-foreground tracking-wide">
                ملاحظات العميل
              </p>
              <p className="border-s-2 border-primary/30 ps-3 text-xs leading-relaxed">
                {requisition.clientNotes}
              </p>
            </div>
          )}

          {requisition.attachments && requisition.attachments.length > 0 && (
            <>
              <Separator />

              <div>
                <p className="mb-2 text-xs font-bold text-muted-foreground tracking-wide">
                  المرفقات
                </p>
                <div className="divide-y divide-border">
                  {requisition.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={api.attachments.downloadUrl(attachment.id)}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p dir="ltr" className="truncate text-left text-xs font-bold">
                          {attachment.fileName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBytes(attachment.sizeBytes)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-primary">تحميل</span>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <p className="mb-4 text-xs font-bold text-muted-foreground tracking-wide">
              سجل العمليات والتدقيق
            </p>
            {requisition.auditLogs && requisition.auditLogs.length > 0 ? (
              <div>
                {requisition.auditLogs.map((log, index) => {
                  const actionMeta = AUDIT_ACTION_META[log.action] ?? {
                    label: log.action,
                    tone: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
                  }
                  const isLast = index === requisition.auditLogs!.length - 1
                  return (
                    <div key={log.id} className="relative ps-5 pb-5 last:pb-0">
                      {!isLast && (
                        <span className="absolute start-0 top-1.5 h-[calc(100%-0.5rem)] w-px bg-border" />
                      )}
                      <span
                        className={`absolute start-0 top-1 h-2 w-2 -translate-x-1/2 rounded-full ${actionMeta.tone}`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{actionMeta.label}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      {(log.statusFrom || log.statusTo) && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {log.statusFrom && STATUS_META[log.statusFrom as RequisitionStatus]?.label}
                          {log.statusFrom && log.statusTo && ' ← '}
                          {log.statusTo && STATUS_META[log.statusTo as RequisitionStatus]?.label}
                        </p>
                      )}
                      {log.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">لا توجد سجلات تدقيق</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}