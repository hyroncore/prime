import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useArrowFieldNavigation } from '@/hooks/useArrowFieldNavigation'
import { useAppStore } from '@/store/useAppStore'

export function ClientFormDialog() {
  const open = useAppStore((s) => s.clientDialogOpen)
  const close = useAppStore((s) => s.closeClientDialog)
  const editingClient = useAppStore((s) => s.editingClient)
  const createClient = useAppStore((s) => s.createClient)
  const updateClient = useAppStore((s) => s.updateClient)
  const contentRef = useRef<HTMLDivElement>(null)
  useArrowFieldNavigation(contentRef, open)

  const { toast } = useToast()

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(editingClient?.name ?? '')
      setContactName(editingClient?.primaryContactName ?? '')
      setContactPhone(editingClient?.primaryContactPhone ?? '')
      setError(null)
    }
  }, [open, editingClient])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('اسم الجهة مطلوب')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body = {
        name: name.trim(),
        primaryContactName: contactName.trim() || null,
        primaryContactPhone: contactPhone.trim() || null,
      }
      if (editingClient) {
        await updateClient(editingClient.id, body)
      } else {
        await createClient({ ...body, plants: [] })
      }
      close()
      toast({
        title: editingClient ? 'تم تعديل الجهة بنجاح' : 'تمت إضافة الجهة بنجاح',
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ الجهة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent ref={contentRef} className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">
            {editingClient ? 'تعديل الجهة' : 'إضافة جهة جديدة'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            تُستخدم الجهات المرتبطة بالعملاء عند إضافة أو تعديل عميل
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>اسم الجهة / الشركة</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شركة الأهلية للأسمنت"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مسؤول التواصل</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="مثال: م. محمد عمر"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="مثال: +218 91 000 1111"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            {submitting ? 'جارٍ الحفظ...' : editingClient ? 'حفظ التعديلات' : 'حفظ الجهة'}
          </Button>
          <Button
            variant="outline"
            onClick={close}
            disabled={submitting}
            className="w-full text-xs font-semibold"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}