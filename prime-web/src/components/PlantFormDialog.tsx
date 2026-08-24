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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useArrowFieldNavigation } from '@/hooks/useArrowFieldNavigation'
import { useAppStore } from '@/store/useAppStore'

export function PlantFormDialog() {
  const open = useAppStore((s) => s.plantDialogOpen)
  const close = useAppStore((s) => s.closePlantDialog)
  const editingPlant = useAppStore((s) => s.editingPlant)
  const createPlant = useAppStore((s) => s.createPlant)
  const updatePlant = useAppStore((s) => s.updatePlant)
  const clients = useAppStore((s) => s.clients)
  const contentRef = useRef<HTMLDivElement>(null)
  useArrowFieldNavigation(contentRef, open)

  const { toast } = useToast()

  const [plantName, setPlantName] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [clientId, setClientId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPlantName(editingPlant?.plantName ?? '')
      setShortCode(editingPlant?.shortCode ?? '')
      setClientId(editingPlant ? String(editingPlant.clientId) : '')
      setError(null)
    }
  }, [open, editingPlant])

  const handleSubmit = async () => {
    if (!plantName.trim()) {
      setError('اسم العميل مطلوب')
      return
    }
    if (!shortCode.trim()) {
      setError('الرمز المختصر مطلوب')
      return
    }
    if (!clientId) {
      setError('يرجى اختيار الجهة المرتبطة')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body = {
        plantName: plantName.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        clientId: Number(clientId),
      }
      if (editingPlant) {
        await updatePlant(editingPlant.id, body)
      } else {
        await createPlant(body)
      }
      close()
      toast({
        title: editingPlant ? 'تم تعديل العميل بنجاح' : 'تمت إضافة العميل بنجاح',
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ المصنع')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent ref={contentRef} className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">
            {editingPlant ? 'تعديل العميل' : 'إضافة عميل جديد'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingPlant
              ? 'قم بتحديث بيانات العميل أو تغيير الجهة المرتبطة'
              : 'أضف عميلاً جديداً واربطه بالجهة التابعة له'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>اسم العميل</Label>
            <Input
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              placeholder="مثال: مصنع لبدة"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>الرمز المختصر</Label>
            <Input
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              placeholder="مثال: LB"
              dir="ltr"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>الجهة / الشركة المرتبطة</Label>
            {clients.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                لا توجد جهات مسجلة — أضف جهة من صفحة الإعدادات أولاً
              </p>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="اختر الجهة" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            {submitting ? 'جارٍ الحفظ...' : editingPlant ? 'حفظ التعديلات' : 'حفظ العميل'}
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