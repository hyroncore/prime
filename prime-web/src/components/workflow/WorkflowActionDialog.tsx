import { useEffect, useState, type FormEvent } from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WorkflowActionType, ACTION_LABELS } from './workflowTypes'

interface WorkflowActionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (notes: string) => Promise<void>
  actionType: WorkflowActionType
}

export function WorkflowActionDialog({
  open,
  onClose,
  onConfirm,
  actionType,
}: WorkflowActionDialogProps) {
  const { label, variant } = ACTION_LABELS[actionType]
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNotes('')
      setError(null)
    }
  }, [open])

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedNotes = notes.trim()
    if (!trimmedNotes) {
      setError('أدخل ملاحظات موجزة لتوضيح هذا الإجراء.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onConfirm(trimmedNotes)
      onClose()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'تعذر تنفيذ الإجراء.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-black">{label} الطلب</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            أضف ملاحظة قصيرة لتوضيح الإجراء وحفظها في سجل الطلب.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={(event) => void handleConfirm(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-action-notes" className="text-sm font-semibold">
              ملاحظات الإجراء
            </Label>
            <Textarea
              id="workflow-action-notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                if (error) setError(null)
              }}
              placeholder="اكتب الملاحظات هنا..."
              className="min-h-28 text-sm"
              maxLength={1000}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'workflow-action-error' : 'workflow-action-hint'}
              disabled={busy}
              autoFocus
            />
            <p id="workflow-action-hint" className="text-xs text-muted-foreground">
              الملاحظات مطلوبة. الحد الأقصى 1000 حرف.
            </p>
          </div>

          {error && (
            <p id="workflow-action-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              variant={variant}
              className="h-11 w-full sm:w-auto"
            >
              {busy ? 'جارٍ الحفظ…' : label}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
              className="h-11 w-full sm:w-auto"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
