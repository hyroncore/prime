import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
  const role = useAuthStore((s) => s.user?.role)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isAdmin = role === 'Admin'

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
    let firstUploadError: string | null = null
    for (const file of accepted) {
      try {
        await api.requisitions.attachments.upload(requisitionId, file)
      } catch (error) {
        failures += 1
        firstUploadError ??=
          error instanceof Error ? error.message : 'تعذر رفع أحد المرفقات'
      }
    }
    setAttachmentsBusy(false)
    if (failures > 0) {
      toast({
        title: `تعذر رفع ${failures} من المرفقات (${accepted.length})`,
        description: firstUploadError ?? undefined,
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
    setAttachmentDeleteError(null)
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
      if (detail?.status === 'SUBMITTED' && (status === 'WON' || status === 'LOST')) {
        await api.requisitions.markOutcome(requisitionId, status, notes.trim())
      } else {
        await updateRequisitionStatus(requisitionId, status, notes.trim())
      }
      setNotes('')
      await load()
      successToast('تم تحديث حالة الطلب بنجاح')
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'تعذر تحديث الحالة')
    } finally {
      setBusy(false)
    }
  }

  const handleWorkflowRequest = async (
    action: (notes: string) => Promise<unknown>,
    successMessage: string,
    errorMessage: string,
  ) => {
    if (!notes.trim()) {
      setStatusError('يرجى كتابة ملاحظات قبل تنفيذ الإجراء')
      return
    }
    setBusy(true)
    setStatusError(null)
    try {
      await action(notes.trim())
      setNotes('')
      await load()
      successToast(successMessage)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : errorMessage)
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
      <div dir="rtl" className="mx-auto w-full max-w-screen-xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Card>
          <CardContent className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-5 w-36 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-20 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadError || !detail) {
    return (
      <div dir="rtl" className="mx-auto w-full max-w-screen-xl space-y-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/requisitions')}
          className="min-h-11 px-2"
        >
          العودة إلى الطلبات
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <h1 className="text-lg font-bold">{loadError ?? 'الطلب غير موجود'}</h1>
            <p className="text-sm text-muted-foreground">
              قد يكون الطلب محذوفاً أو أن الرابط غير صحيح
            </p>
            {loadError && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void load()}
                className="min-h-11"
              >
                إعادة المحاولة
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const allowed = (ALLOWED_TRANSITIONS[detail.status] ?? []).filter((target) => {
    return role === 'User' &&
      detail.createdById === currentUserId &&
      ((detail.status === 'NEW' && target === 'REVIEW') ||
        (detail.status === 'SUBMITTED' && (target === 'WON' || target === 'LOST')))
  })
  const isOwner = detail.createdById === currentUserId
  const isManager = role === 'Manager' || role === 'Admin'
  const canRequestManagerReview =
    role === 'User' &&
    isOwner &&
    (detail.status === 'PROCESSING' || detail.status === 'REVISE')
  const canRequestInternalApproval =
    role === 'User' && isOwner && detail.status === 'READY_FOR_APPROVAL'
  const canSubmitToClient = role === 'User' && isOwner && detail.status === 'APPROVED'
  const canInitialManagerReview = isManager && detail.status === 'REVIEW'
  const canManagerReview = isManager && detail.status === 'MANAGER_REVIEW'
  const canManagerApproveInternally = isManager && detail.status === 'INTERNAL_APPROVAL'
  const hasWorkflowAction =
    canRequestManagerReview ||
    canRequestInternalApproval ||
    canSubmitToClient ||
    canInitialManagerReview ||
    canManagerReview ||
    canManagerApproveInternally

  return (
    <div dir="rtl" className="mx-auto w-full max-w-screen-xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        onClick={() => navigate('/requisitions')}
        className="min-h-11 px-2"
      >
        العودة إلى الطلبات
      </Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 dir="ltr" className="text-2xl font-black tracking-tight">
              {detail.identifier}
            </h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {detail.clientName} · {detail.plantName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/requisitions/${detail.id}/print`)}
            className="min-h-11"
          >
            طباعة
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/requisitions/${detail.id}/edit`)}
            className="min-h-11"
          >
            تعديل
          </Button>
          {isAdmin && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteError(null)
                setConfirmDelete(true)
              }}
              className="min-h-11"
            >
              حذف الطلب
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold">معلومات الطلب</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="المرجع الخارجي" value={detail.externalRef} />
          <Field label="تاريخ الاستلام" value={formatDate(detail.receivedAt)} />
          <Field label="تاريخ الاستحقاق" value={formatDate(detail.dueDate)} />
          <Field label="العميل" value={detail.clientName} />
          <Field label="المصنع" value={`${detail.plantName} [${detail.plantShortCode}]`} />
          <Field label="القسم" value={`${detail.sectorCode} - ${detail.sectorName}`} />
          <Field label="تاريخ الإنشاء" value={formatDate(detail.createdAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold">تفاصيل الطلب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 border-t pt-5">
          <section aria-labelledby="requisition-title">
            <h2 id="requisition-title" className="mb-2 text-xs font-bold text-muted-foreground">
              عنوان الطلب
            </h2>
            <p className="text-sm font-semibold leading-relaxed">{detail.title}</p>
          </section>
          {detail.clientNotes && (
            <section aria-labelledby="client-notes-title" className="border-t pt-5">
              <h2 id="client-notes-title" className="mb-2 text-xs font-bold text-muted-foreground">
                ملاحظات العميل
              </h2>
              <p className="text-sm leading-relaxed">{detail.clientNotes}</p>
            </section>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold">المرفقات</CardTitle>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
              {detail.attachments?.length ?? 0}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            aria-label="اختيار ملفات لإرفاقها بالطلب"
            onChange={handleAttachmentFiles}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachmentsBusy}
            className="min-h-11"
          >
            {attachmentsBusy ? 'جارٍ الرفع...' : 'إضافة ملفات'}
          </Button>
        </CardHeader>
        <CardContent className="border-t pt-5" aria-busy={attachmentsBusy}>
          <div
            {...dropzone.handlers}
            className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
              dropzone.isDragOver ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <p className="mb-4 text-sm text-muted-foreground">
              اسحب الملفات وأفلتها هنا أو استخدم زر «إضافة ملفات»
            </p>

            {attachmentErrors.length > 0 && (
              <ul role="alert" className="mb-4 space-y-2">
                {attachmentErrors.map((error, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            )}

            {detail.attachments && detail.attachments.length > 0 ? (
              <>
                <ul className="divide-y divide-border">
                  {detail.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex flex-wrap items-center gap-3 py-3">
                      <a
                        href={api.attachments.downloadUrl(attachment.id)}
                        dir="ltr"
                        className="min-w-0 flex-1 rounded-sm text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate text-sm font-semibold hover:text-primary">
                          {attachment.fileName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                          {formatBytes(attachment.sizeBytes)} · {formatDate(attachment.uploadedAt)}
                        </span>
                      </a>
                      <a
                        href={api.attachments.downloadUrl(attachment.id)}
                        className="min-h-11 rounded-sm px-2 py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        تحميل
                      </a>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setAttachmentDeleteError(null)
                            setConfirmAttachmentDelete(attachment)
                          }}
                          className="min-h-11 text-destructive hover:text-destructive"
                        >
                          حذف
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground tabular-nums">
                  إجمالي {detail.attachments.length} مرفق ·{' '}
                  {formatBytes(
                    detail.attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0)
                  )}
                </p>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                لا توجد مرفقات لهذا الطلب
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(allowed.length > 0 || hasWorkflowAction) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold">
              {hasWorkflowAction ? 'إجراء الطلب' : 'تغيير الحالة'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 border-t pt-5">
            <div className="space-y-2">
              <Label htmlFor="status-change-notes">
                {hasWorkflowAction ? 'ملاحظات الإجراء' : 'وصف التغيير'}
              </Label>
              <Textarea
                id="status-change-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  hasWorkflowAction
                    ? 'اكتب ملاحظات الإجراء أو سبب التعديل'
                    : 'اكتب سبب تغيير الحالة'
                }
                disabled={busy}
                aria-invalid={Boolean(statusError)}
                aria-describedby={statusError ? 'status-change-error' : undefined}
                className="min-h-24"
              />
              {statusError && (
                <p id="status-change-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {statusError}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canRequestManagerReview && (
                <Button
                  type="button"
                  onClick={() =>
                    void handleWorkflowRequest(
                      (message) => api.requisitions.requestManagerReview(requisitionId, message),
                      'تم إرسال الطلب إلى المدير للمراجعة',
                      'تعذر إرسال الطلب للمراجعة',
                    )
                  }
                  disabled={busy}
                  className="min-h-11"
                >
                  {busy ? 'جارٍ الإرسال...' : 'إرسال للمدير للمراجعة'}
                </Button>
              )}
              {canRequestInternalApproval && (
                <Button
                  type="button"
                  onClick={() =>
                    void handleWorkflowRequest(
                      (message) => api.requisitions.requestInternalApproval(requisitionId, message),
                      'تم إرسال طلب الاعتماد الداخلي إلى المدير',
                      'تعذر إرسال طلب الاعتماد الداخلي',
                    )
                  }
                  disabled={busy}
                  className="min-h-11"
                >
                  {busy ? 'جارٍ الإرسال...' : 'طلب الاعتماد الداخلي'}
                </Button>
              )}
              {canSubmitToClient && (
                <Button
                  type="button"
                  onClick={() =>
                    void handleWorkflowRequest(
                      (message) => api.requisitions.submitToClient(requisitionId, message),
                      'تم تسجيل إرسال الطلب إلى العميل',
                      'تعذر تسجيل إرسال الطلب',
                    )
                  }
                  disabled={busy}
                  className="min-h-11"
                >
                  {busy ? 'جارٍ الإرسال...' : 'تم الإرسال إلى العميل'}
                </Button>
              )}
              {canManagerReview && (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.managerReview(requisitionId, 'approve', message),
                        'تم قبول مراجعة المدير',
                        'تعذر قبول المراجعة',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    قبول المراجعة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.managerReview(requisitionId, 'revise', message),
                        'تم إرسال طلب التعديل إلى المستخدم',
                        'تعذر إرسال طلب التعديل',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    طلب تعديل
                  </Button>
                </>
              )}
              {canInitialManagerReview && (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.approveReview(requisitionId, message),
                        'تمت الموافقة على الطلب وبدء المعالجة',
                        'تعذر بدء معالجة الطلب',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    الموافقة وبدء المعالجة
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.declineReview(requisitionId, message),
                        'تم رفض الطلب',
                        'تعذر رفض الطلب',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    رفض الطلب
                  </Button>
                </>
              )}
              {canManagerApproveInternally && (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.approveInternal(requisitionId, message),
                        'تم الاعتماد الداخلي',
                        'تعذر اعتماد الطلب داخلياً',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    اعتماد داخلي
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void handleWorkflowRequest(
                        (message) => api.requisitions.workflow.requestRevision(requisitionId, message),
                        'تم إرسال طلب التعديل إلى المستخدم',
                        'تعذر إرسال طلب التعديل',
                      )
                    }
                    disabled={busy}
                    className="min-h-11"
                  >
                    طلب تعديل
                  </Button>
                </>
              )}
              {allowed.map((target) => (
                <Button
                  key={target}
                  type="button"
                  variant="outline"
                  onClick={() => void handleStatusChange(target)}
                  disabled={busy}
                  className="min-h-11"
                >
                  {busy ? 'جارٍ التحديث...' : `تحويل إلى: ${STATUS_META[target].label}`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold">سجل العمليات والتدقيق</CardTitle>
        </CardHeader>
        <CardContent className="border-t pt-5">
          {detail.auditLogs && detail.auditLogs.length > 0 ? (
            <ol className="space-y-5">
              {detail.auditLogs.map((log) => {
                const actionMeta = AUDIT_ACTION_META[log.action] ?? {
                  label: log.action,
                  tone: 'bg-muted text-muted-foreground border-border',
                }
                return (
                  <li key={log.id} className="relative border-s border-border ps-4 last:border-transparent">
                    <span
                      aria-hidden="true"
                      className={`absolute start-0 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border ${actionMeta.tone}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{actionMeta.label}</p>
                      <time dateTime={log.createdAt} className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(log.createdAt)}
                      </time>
                    </div>
                    {(log.statusFrom || log.statusTo) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {log.statusFrom && STATUS_META[log.statusFrom as RequisitionStatus]?.label}
                        {log.statusFrom && log.statusTo && ' ← '}
                        {log.statusTo && STATUS_META[log.statusTo as RequisitionStatus]?.label}
                      </p>
                    )}
                    {log.notes && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {log.notes}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سجلات تدقيق</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الطلب</AlertDialogTitle>
              <AlertDialogDescription>
              هل أنت متأكد من حذف الطلب{' '}
              <span className="font-bold text-foreground">{detail.identifier}</span>؟ سيتم حذف جميع
              سجلاته نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="min-h-11"
            >
              {deleting ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="min-h-11"
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
            <AlertDialogTitle>تأكيد حذف المرفق</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المرفق{' '}
              <span dir="ltr" className="font-bold text-foreground">
                {confirmAttachmentDelete?.fileName}
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {attachmentDeleteError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {attachmentDeleteError}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleAttachmentDelete}
              disabled={attachmentDeleting}
              className="min-h-11"
            >
              {attachmentDeleting ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAttachmentDelete(null)}
              disabled={attachmentDeleting}
              className="min-h-11"
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