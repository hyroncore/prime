import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useFileDropzone } from '@/hooks/useFileDropzone'
import { api } from '@/lib/api'
import {
  ALLOWED_TRANSITIONS,
  AUDIT_ACTION_META,
  formatBytes,
  formatDate,
  formatDateTime,
  STATUS_META,
  validateAttachment,
} from '@/lib/format'
import type { AttachmentDto, RequisitionDto, RequisitionStatus } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'

export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requisitionId = Number(id)

  const updateRequisitionStatus = useAppStore((s) => s.updateRequisitionStatus)
  const deleteRequisition = useAppStore((s) => s.deleteRequisition)
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')

  const { toast } = useToast()

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const [detail, setDetail] = useState<RequisitionDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [attachmentsBusy, setAttachmentsBusy] = useState(false)
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([])
  const [confirmAttachmentDelete, setConfirmAttachmentDelete] = useState<AttachmentDto | null>(null)
  const [attachmentDeleting, setAttachmentDeleting] = useState(false)
  const [attachmentDeleteError, setAttachmentDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || attachmentsBusy) return

    const errors: string[] = []
    const accepted: File[] = []
    for (const file of files) {
      const error = validateAttachment(file)
      if (error) errors.push(error)
      else accepted.push(file)
    }
    setAttachmentErrors(errors)
    if (accepted.length === 0) return

    setAttachmentsBusy(true)
    let failures = 0
    for (const file of accepted) {
      try {
        await api.requisitions.attachments.upload(requisitionId, file)
      } catch {
        failures += 1
      }
    }
    setAttachmentsBusy(false)
    if (failures > 0) {
      toast({
        title: `تعذر رفع ${failures} من المرفقات (${accepted.length})`,
        variant: 'destructive',
      })
    } else {
      successToast('تم رفع المرفقات بنجاح')
    }
    await load()
  }

  const handleAttachmentFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    void uploadFiles(files)
  }

  const dropzone = useFileDropzone((files) => void uploadFiles(files))

  const handleAttachmentDelete = async () => {
    if (!confirmAttachmentDelete) return
    setAttachmentDeleting(true)
    setDeleteError(null)
    try {
      await api.requisitions.attachments.remove(confirmAttachmentDelete.id)
      setConfirmAttachmentDelete(null)
      successToast('تم حذف المرفق بنجاح')
      await load()
    } catch (e) {
      setAttachmentDeleteError(e instanceof Error ? e.message : 'حدث خطأ أثناء حذف المرفق')
    } finally {
      setAttachmentDeleting(false)
    }
  }

  const load = useCallback(async () => {
    if (!Number.isFinite(requisitionId)) {
      setLoadError('طلب غير صالح')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      setDetail(await api.requisitions.detail(requisitionId))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الطلب')
    } finally {
      setLoading(false)
    }
  }, [requisitionId])

  useEffect(() => {
    void load()
  }, [load])

  const handleStatusChange = async (status: string) => {
    if (!notes.trim()) {
      setStatusError('يرجى كتابة وصف التغيير قبل تحويل الحالة')
      return
    }
    setBusy(true)
    setStatusError(null)
    try {
      await updateRequisitionStatus(requisitionId, status, notes.trim())
      setNotes('')
      await load()
      successToast('تم تحديث حالة الطلب بنجاح')
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'تعذر تحديث الحالة')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRequisition(requisitionId)
      successToast('تم حذف الطلب بنجاح')
      navigate('/requisitions', { replace: true })
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-52 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (loadError || !detail) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => navigate('/requisitions')}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          رجوع إلى قائمة الطلبات ←
        </button>
        <div className="py-16 text-center">
          <p className="text-sm font-black">{loadError ?? 'الطلب غير موجود'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            قد يكون الطلب محذوفاً أو أن الرابط غير صحيح
          </p>
          <Button
            onClick={() => navigate('/requisitions')}
            className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            العودة لقائمة الطلبات
          </Button>
        </div>
      </div>
    )
  }

  const allowed = ALLOWED_TRANSITIONS[detail.status] ?? []

  return (
    <div dir="rtl" className="space-y-8">
      <button
        onClick={() => navigate('/requisitions')}
        className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        رجوع إلى قائمة الطلبات ←
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 dir="ltr" className="font-mono text-2xl font-black tracking-tight text-right">
              {detail.identifier}
            </h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.clientName} · {detail.plantName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => navigate(`/requisitions/${detail.id}/print`)}
            className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            طباعة
          </button>
          <Button
            onClick={() => navigate(`/requisitions/${detail.id}/edit`)}
            variant="outline"
            className="text-xs font-bold"
          >
            تعديل
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setConfirmDelete(true)}
              variant="outline"
              className="text-xs font-bold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900"
            >
              حذف
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <Field label="المرجع الخارجي" value={detail.externalRef} />
        <Field label="تاريخ الاستلام" value={formatDate(detail.receivedAt)} />
        <Field label="تاريخ الاستحقاق" value={formatDate(detail.dueDate)} />
        <Field label="العميل" value={detail.clientName} />
        <Field label="المصنع" value={`${detail.plantName} [${detail.plantShortCode}]`} />
        <Field label="القسم" value={`${detail.sectorCode} - ${detail.sectorName}`} />
        <Field label="تاريخ الإنشاء" value={formatDate(detail.createdAt)} />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <Field label="المرجع الخارجي" value={detail.externalRef} />
        <Field label="تاريخ الاستلام" value={formatDate(detail.receivedAt)} />
        <Field label="تاريخ الاستحقاق" value={formatDate(detail.dueDate)} />
        <Field label="العميل" value={detail.clientName} />
        <Field label="المصنع" value={`${detail.plantName} [${detail.plantShortCode}]`} />
        <Field label="القسم" value={`${detail.sectorCode} - ${detail.sectorName}`} />
        <Field label="تاريخ الإنشاء" value={formatDate(detail.createdAt)} />
      </div>

      <Separator />

      <section>
        <p className="mb-3 text-xs font-bold text-muted-foreground tracking-wide">عنوان الطلب</p>
        <p className="text-sm font-bold leading-relaxed">{detail.title}</p>
      </section>

      {detail.clientNotes && (
        <>
          <Separator />
          <section>
            <p className="mb-3 text-xs font-bold text-muted-foreground tracking-wide">
              ملاحظات العميل
            </p>
            <p className="border-s-2 border-primary/30 ps-3 text-xs leading-relaxed">
              {detail.clientNotes}
            </p>
          </section>
        </>
      )}

      <Separator />

      <section>
        <div
          {...dropzone.handlers}
          aria-label="منطقة إضافة المرفقات — اسحب الملفات وأفلتها هنا"
          className={`rounded-xl border-2 border-dashed transition-colors ${
            dropzone.isDragOver ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-3 px-1 pt-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-muted-foreground tracking-wide">المرفقات</p>
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                {detail.attachments?.length ?? 0}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleAttachmentFiles}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachmentsBusy}
              className="text-xs font-bold"
            >
              {attachmentsBusy ? 'جارٍ الرفع...' : 'إضافة ملفات'}
            </Button>
          </div>
          <p className="mb-3 px-1 text-[11px] text-muted-foreground">
            اسحب الملفات وأفلتها هنا أو استخدم زر «إضافة ملفات»
          </p>

          {attachmentErrors.length > 0 && (
          <ul className="mb-3 space-y-1">
            {attachmentErrors.map((error, index) => (
              <li
                key={index}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
              >
                {error}
              </li>
            ))}
          </ul>
        )}

        {detail.attachments && detail.attachments.length > 0 ? (
          <>
            <div className="divide-y divide-border">
              {detail.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-4 py-3">
                  <a href={api.attachments.downloadUrl(attachment.id)} className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold transition-colors hover:text-primary">
                      {attachment.fileName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {formatBytes(attachment.sizeBytes)} · {formatDate(attachment.uploadedAt)}
                    </p>
                  </a>
                  <a
                    href={api.attachments.downloadUrl(attachment.id)}
                    className="shrink-0 text-[11px] font-bold text-primary transition-colors hover:underline"
                  >
                    تحميل
                  </a>
                  {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmAttachmentDelete(attachment)}
                    className="shrink-0 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    حذف
                  </button>
                )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground tabular-nums">
              إجمالي {detail.attachments.length} مرفق ·{' '}
              {formatBytes(detail.attachments.reduce((sum, a) => sum + a.sizeBytes, 0))}
            </p>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
            لا توجد مرفقات لهذا الطلب
          </p>
        )}
        </div>
      </section>

      {allowed.length > 0 && (
        <>
          <Separator />

          <section>
            <p className="mb-3 text-xs font-bold text-muted-foreground tracking-wide">
              تغيير الحالة
            </p>
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="وصف التغيير (مطلوب)"
                className="min-h-[60px] text-xs"
              />
              {statusError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {statusError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {allowed.map((target) => (
                  <Button
                    key={target}
                    variant="outline"
                    onClick={() => handleStatusChange(target)}
                    disabled={busy}
                    className="px-3 py-2 text-xs font-semibold"
                  >
                    تحويل إلى: {STATUS_META[target].label}
                  </Button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <Separator />

      <section>
        <p className="mb-4 text-xs font-bold text-muted-foreground tracking-wide">
          سجل العمليات والتدقيق
        </p>
        {detail.auditLogs && detail.auditLogs.length > 0 ? (
          <div>
            {detail.auditLogs.map((log, index) => {
              const actionMeta = AUDIT_ACTION_META[log.action] ?? {
                label: log.action,
                tone: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
              }
              const isLast = index === detail.auditLogs!.length - 1
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
      </section>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف الطلب{' '}
              <span className="font-bold text-foreground">{detail.identifier}</span>؟ سيتم حذف جميع
              سجلاته نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full text-xs font-bold"
            >
              {deleting ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAttachmentDelete !== null}
        onOpenChange={(open) => !open && setConfirmAttachmentDelete(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد حذف المرفق</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف المرفق{' '}
              <span dir="ltr" className="font-bold text-foreground">
                {confirmAttachmentDelete?.fileName}
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {attachmentDeleteError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {attachmentDeleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={handleAttachmentDelete}
              disabled={attachmentDeleting}
              className="w-full text-xs font-bold"
            >
              {attachmentDeleting ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmAttachmentDelete(null)}
              disabled={attachmentDeleting}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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