import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'

type FormRole = 'Manager' | 'User'

const ROLE_OPTIONS: { value: FormRole; label: string }[] = [
  { value: 'Manager', label: 'مدير' },
  { value: 'User', label: 'مستخدم قياسي' },
]

export function UserFormPage() {
  const navigate = useNavigate()
  const params = useParams()
  const userId = params.id ? parseInt(params.id, 10) : null
  const isEditing = !!userId

  const currentUser = useAuthStore((s) => s.user)
  const createUser = useAuthStore((s) => s.createUser)
  const updateUser = useAuthStore((s) => s.updateUser)

  const { toast } = useToast()

  const [formName, setFormName] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formRole, setFormRole] = useState<FormRole>('User')
  const [formActive, setFormActive] = useState(true)
  const [formPassword, setFormPassword] = useState('')
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isSelf = Boolean(currentUser && userId === currentUser.id)

  useEffect(() => {
    if (isEditing) {
      const loadUser = async () => {
        try {
          const user = await api.users.detail(userId!)
          setFormName(user.displayName)
          setFormUsername(user.username)
          setFormRole(user.role as FormRole)
          setFormActive(user.isActive)
        } catch (e) {
          console.error('Failed to load user:', e)
        }
      }
      loadUser()
    } else {
      setFormName('')
      setFormUsername('')
      setFormRole('User')
      setFormActive(true)
    }
  }, [userId, isEditing])

  const successToast = (title: string) =>
    toast({
      title,
      className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const handleSubmit = async () => {
    if (!formName.trim()) {
      setFormError('اسم العرض مطلوب')
      return
    }
    if (!isEditing && !formUsername.trim()) {
      setFormError('اسم المستخدم مطلوب')
      return
    }
    if (!isEditing && formPassword.length < 8) {
      setFormError('كلمة المرور يجب ألا تقل عن 8 أحرف')
      return
    }
    setFormBusy(true)
    setFormError(null)
    try {
      const roleMap: Record<FormRole, string> = {
        Manager: 'Manager',
        User: 'User',
      }
      const role = roleMap[formRole]

      if (isEditing) {
        await updateUser(userId!, {
          displayName: formName.trim(),
          role: role as any,
          isActive: formActive,
        })
        successToast('تم تعديل المستخدم بنجاح')
      } else {
        if (formPassword.length < 8) {
          setFormError('كلمة المرور يجب ألا تقل عن 8 أحرف')
          return
        }
        await createUser({
          username: formUsername.trim(),
          displayName: formName.trim(),
          role: role as any,
          initialPassword: formPassword,
        })
        successToast('تمت إضافة المستخدم بنجاح')
      }
      navigate('/users')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ المستخدم')
    } finally {
      setFormBusy(false)
    }
  }

  useEffect(() => {
    if (isEditing) {
      const loadUser = async () => {
        try {
          const user = await api.users.detail(userId!)
          setFormName(user.displayName)
          setFormUsername(user.username)
          setFormRole(user.role as FormRole)
          setFormActive(user.isActive)
        } catch (e) {
          console.error('Failed to load user:', e)
        }
      }
      loadUser()
    } else {
      setFormName('')
      setFormUsername('')
      setFormRole('User')
      setFormActive(true)
    }
  }, [userId, isEditing])

  const pageTitle = isEditing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'
  const pageDescription = isEditing
    ? 'تعديل اسم العرض والدور وحالة الحساب'
    : 'إنشاء حساب دخول جديد مع صلاحية دور محدد'

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pageDescription}</p>
        </div>
        <Button onClick={() => navigate('/users')} variant="outline" className="text-xs font-semibold">
          العودة للمستخدمين
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black">{pageTitle}</CardTitle>
          <CardDescription className="text-xs">{pageDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>اسم المستخدم</Label>
            <Input
              dir="ltr"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              placeholder="username"
              className="h-9 text-sm"
              disabled={isEditing}
            />
          </div>

          <div className="space-y-1.5">
            <Label>اسم العرض</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="مثال: م. أحمد سالم"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>الدور</Label>
              <Select
                value={formRole}
                onValueChange={(v) => setFormRole(v as FormRole)}
                disabled={isSelf}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>حالة الحساب</Label>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-border px-3">
                <input
                  id="user-active"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  disabled={isSelf}
                  className="h-4 w-4 accent-[#415a77]"
                />
                <label htmlFor="user-active" className="text-xs font-semibold text-muted-foreground">
                  حساب نشط
                </label>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <Input
                dir="ltr"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="h-9 text-sm"
              />
            </div>
          )}

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void handleSubmit()}
              disabled={formBusy}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              {formBusy ? 'جارٍ الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ المستخدم'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/users')}
              disabled={formBusy}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}