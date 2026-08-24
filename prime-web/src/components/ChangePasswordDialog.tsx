import { useState } from 'react'
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
import { useAuthStore } from '@/store/useAuthStore'

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const changePassword = useAuthStore((s) => s.changePassword)
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!currentPassword) {
      setError('يرجى إدخال كلمة المرور الحالية')
      return
    }
    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(currentPassword, newPassword)
      reset()
      onOpenChange(false)
      toast({
        title: 'تم تغيير كلمة المرور بنجاح',
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">تغيير كلمة المرور</DialogTitle>
          <DialogDescription className="text-xs">
            قم بتحديث كلمة مرور حسابك الحالي
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>كلمة المرور الحالية</Label>
            <Input
              dir="ltr"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>كلمة المرور الجديدة</Label>
            <Input
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>تأكيد كلمة المرور الجديدة</Label>
            <Input
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            {busy ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="w-full text-xs font-semibold"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}