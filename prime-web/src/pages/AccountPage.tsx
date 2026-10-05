import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import { formatRelativeTime } from '@/lib/format'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useAuthStore } from '@/store/useAuthStore'

function roleLabel(role?: string) {
  switch (role) {
    case 'Admin':
      return 'مسؤول النظام'
    case 'Manager':
      return 'مدير'
    case 'User':
      return 'مستخدم قياسي'
    default:
      return '—'
  }
}

export function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">الحساب</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          عرض معلومات حسابك وإدارة كلمة المرور
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black">معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {user?.displayName || '—'}
            </h2>
            <Badge variant="outline" className="rounded-full py-0">
              {roleLabel(user?.role)}
            </Badge>
          </div>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">اسم المستخدم</p>
              <p className="text-sm font-semibold" dir="ltr">
                {user?.username ? `@${user.username}` : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">حالة الحساب</p>
              <p className="text-sm font-semibold">
                {user?.isActive ? 'نشط' : 'معطل'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">تاريخ الانضمام</p>
              <p className="text-sm font-semibold">
                {user?.createdAt
                  ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: ar })
                  : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">آخر دخول</p>
              <p className="text-sm font-semibold">
                {user?.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'لم يسجل دخول بعد'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black">الأمان</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">كلمة المرور</p>
              <p className="mt-1 text-xs text-muted-foreground">
                حدّث كلمة المرور للحفاظ على أمان حسابك
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(true)}
              className="text-xs font-semibold"
            >
              تغيير كلمة المرور
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start border-t border-border pt-5">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="text-xs font-semibold text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          تسجيل الخروج
        </Button>
      </div>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </div>
  )
}
