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
import { useAuthStore } from '@/store/useAuthStore'

export function PlantFormDialog() {
  const open = useAppStore((s) => s.plantDialogOpen)
  const close = useAppStore((s) => s.closePlantDialog)
  const editingPlant = useAppStore((s) => s.editingPlant)
  const updatePlant = useAppStore((s) => s.updatePlant)
  const createClient = useAppStore((s) => s.createClient)
  const clients = useAppStore((s) => s.clients)
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const contentRef = useRef<HTMLDivElement>(null)
  useArrowFieldNavigation(contentRef, open)

  const { toast } = useToast()

  const [plantName, setPlantName] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [clientId, setClientId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline client creation state
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCode, setNewClientCode] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPlantName(editingPlant?.plantName ?? '')
      setShortCode(editingPlant?.shortCode ?? '')
      setClientId(editingPlant ? String(editingPlant.clientId) : '')
      setError(null)
      setClientError(null)
    }
  }, [open, editingPlant])

  const handleSubmit = async () => {
    if (!editingPlant) return
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
      await updatePlant(editingPlant.id, body)
      close()
      toast({
        title: 'تم تعديل العميل بنجاح',
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ المصنع')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setClientError('اسم الجهة مطلوب')
      return
    }
    if (!newClientCode.trim()) {
      setClientError('كود الشركة مطلوب')
      return
    }

    setCreatingClient(true)
    setClientError(null)
    try {
      const newClient = await createClient({
        name: newClientName.trim(),
        code: newClientCode.trim().toUpperCase(),
        primaryContactName: null,
        primaryContactPhone: null,
      })
      setClientId(String(newClient.id))
      setShowClientDialog(false)
      setNewClientName('')
      setNewClientCode('')
      toast({
        title: 'تم إنشاء الجهة بنجاح',
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
    } catch (e) {
      setClientError(e instanceof Error ? e.message : 'حدث خطأ أثناء إنشاء الجهة')
    } finally {
      setCreatingClient(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent ref={contentRef} className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">تعديل العميل</DialogTitle>
            <DialogDescription className="text-xs">
              قم بتحديث بيانات العميل أو تغيير الجهة المرتبطة
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
              <div className="flex items-center gap-2">
                {clients.length === 0 ? (
                  <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground flex-1">
                    لا توجد جهات مسجلة
                  </p>
                ) : (
                  <div>
                    <Select
                      value={clientId}
                      onValueChange={(value) => {
                        if (value === '__create_new__') {
                          setShowClientDialog(true)
                          return
                        }
                        setClientId(value)
                      }}
                    >
                      <SelectTrigger className="w-full text-sm flex-1">
                        <SelectValue placeholder="اختر الجهة" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name} {client.code && `(${client.code})`}
                          </SelectItem>
                        ))}
                        {isAdmin && (
                          <SelectItem value="__create_new__">
                            + إنشاء شركة جديدة
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowClientDialog(true)}
                        className="h-9"
                        aria-label="إنشاء شركة جديدة"
                      >
                        <span className="text-lg">+</span>
                      </Button>
                    )}
                  </div>
              )}
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
            {submitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
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

    {/* Inline Client Creation Dialog */}
    <Dialog open={showClientDialog} onOpenChange={(o) => !o && setShowClientDialog(false)}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">إضافة شركة جديدة</DialogTitle>
          <DialogDescription className="text-xs">
            أضف شركة لتكون الجهة الأم لهذا المصنع.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>اسم الشركة</Label>
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="مثال: الشركة الأهلية"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>كود الشركة</Label>
            <Input
              value={newClientCode}
              onChange={(e) => setNewClientCode(e.target.value)}
              placeholder="مثال: ACME"
              dir="ltr"
              className="h-9 text-sm"
            />
          </div>

          {clientError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {clientError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleCreateClient}
            disabled={creatingClient || !newClientName.trim() || !newClientCode.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            {creatingClient ? 'جارٍ الإنشاء...' : 'إنشاء الشركة'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowClientDialog(false)}
            disabled={creatingClient}
            className="w-full text-xs font-semibold"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}