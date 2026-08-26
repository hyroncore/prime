import { useState } from 'react'
import { Bell, LogOut, Mail, Calendar, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { MetricAvatar } from '@/components/ui/MetricAvatar'
import { formatRelativeTime } from '@/lib/format'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword.length < 8) {
      toast({ title: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف', className: 'border-red-200 bg-red-50 text-red-800' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'كلمة المرور الجديدة وتأكيدها غير متطابقين', className: 'border-red-200 bg-red-50 text-red-800' })
      return
    }
    setPasswordLoading(true)
    try {
      await api.auth.changePassword({ currentPassword, newPassword })
      toast({ title: 'تم تغيير كلمة المرور بنجاح', className: 'border-green-200 bg-green-50 text-green-800' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast({ title: error.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور', className: 'border-red-200 bg-red-50 text-red-800' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogoutClick = () => {
    logout()
    window.location.assign('/login')
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">الحساب</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة إعدادات الحساب وكلمة المرور</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <MetricAvatar username={user?.username || ''} size="xl" showInitials />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-foreground truncate">{user?.displayName}</h2>
                    <Badge variant="outline" className="text-sm">
                      {user?.role === 'Admin' ? 'مسؤول النظام' : 'مستخدم'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm truncate">@{user?.username}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>لم يتم تعيين بريد إلكتروني</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>انضم في {user?.createdAt ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: ar }) : 'غير معروف'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                الأمان وكلمة المرور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">تغيير كلمة المرور</h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                      <div className="relative mt-1">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="كلمة المرور الحالية"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                      <div className="relative mt-1">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="8 أحرف على الأقل"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                      <div className="relative mt-1">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="تأكيد كلمة المرور"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={passwordLoading}
                      className="w-full sm:w-auto"
                    >
                      {passwordLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setShowCurrentPassword(false)
                        setShowNewPassword(false)
                        setShowConfirmPassword(false)
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-600" />
                إجراءات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleLogoutClick} className="flex-1">
                  <LogOut className="h-4 w-4 mr-2" />
                  تسجيل الخروج
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                سيتم تسجيل خروجك من جميع الجلسات. ستحتاج لتسجيل الدخول مرة أخرى.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                ملخص الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] font-medium text-muted-foreground">الدور</p>
                  <p className="text-lg font-bold text-foreground capitalize">{user?.role === 'Admin' ? 'مسؤول' : 'مستخدم'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] font-medium text-muted-foreground">الحالة</p>
                  <p className="text-lg font-bold text-green-600">نشط</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">آخر دخول</span>
                  <span className="font-medium">{user?.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'لم يسجل دخول بعد'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">تاريخ الانضمام</span>
                  <span className="font-medium">{user?.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy', { locale: ar }) : 'غير معروف'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-600" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleLogoutClick}>
                <LogOut className="h-4 w-4 mr-2" />
                تسجيل الخروج
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}