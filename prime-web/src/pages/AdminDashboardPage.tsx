import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/store/useAppStore'
import { formatRelativeTime } from '@/lib/format'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const adminStats = useAppStore((s) => s.adminStats)
  const loading = useAppStore((s) => s.loading)
  const setAdminStats = useAppStore((s) => s.setAdminStats)
  const setLoading = useAppStore((s) => s.setLoading)
  const setError = useAppStore((s) => s.setError)

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        setLoading(true)
        const stats = await import('@/lib/api').then(m => m.api.dashboard.adminStats())
        if (!cancelled) setAdminStats(stats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [setAdminStats, setLoading, setError])

  if (loading && !adminStats) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24 rounded mb-3" />
              <Skeleton className="h-9 w-32 rounded mb-1" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!adminStats) return null

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير العام</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            نظرة شاملة على صحة النظام — مستخدمين، عملاء، وإعدادات
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/users')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            إدارة المستخدمين
          </Button>
          <Button
            onClick={() => navigate('/settings')}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-bold"
          >
            الإعدادات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8">
        <div className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
            إجمالي المستخدمين
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">
            {adminStats.totalUsers}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            حسابات مسجلة في النظام
          </p>
        </div>
        <div className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
            المستخدمون النشطون
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-green-700 dark:text-green-400">
            {adminStats.activeUsers}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            لديهم صلاحية دخول فعالة
          </p>
        </div>
        <div className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
            إجمالي العملاء
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">
            {adminStats.totalClients}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            عملاء مسجلون في النظام
          </p>
        </div>
        <div className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
            العملاء النشطون
          </p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-blue-700 dark:text-blue-400">
            {adminStats.activeClients}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            لديهم طلبات أو مصانع نشطة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-7">
          <Card>
            <div className="p-4 border-b border-border">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                المستخدمون مؤخراً
              </p>
            </div>
            <div className="p-4">
              {adminStats.recentUsers && adminStats.recentUsers.length > 0 ? (
                <div className="divide-y divide-border">
                  {adminStats.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-sm font-bold text-primary">
                            {user.displayName?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.displayName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            user.isActive
                              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {user.isActive ? 'نشط' : 'معطل'}
                        </span>
                        <span className="text-muted-foreground">
                          {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'لم يسجل دخول'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا يوجد مستخدمون</p>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5 space-y-10">
          <Card>
            <div className="p-4 border-b border-border">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                العملاء الأكثر نشاطاً
              </p>
            </div>
            <div className="p-4">
              {adminStats.topClients && adminStats.topClients.length > 0 ? (
                <div className="divide-y divide-border">
                  {adminStats.topClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                      <p className="truncate text-sm font-bold">{client.name}</p>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-center">
                          <p className="text-base font-black tabular-nums">{client.totalRequisitions}</p>
                          <p className="text-[10px] text-muted-foreground font-bold tracking-wide">
                            طلبات
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-black tabular-nums text-green-700 dark:text-green-400">
                            {client.wonCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold tracking-wide">
                            فائزة
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد بيانات عملاء</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-border">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                إجراءات سريعة
              </p>
            </div>
            <div className="p-4 space-y-2">
              <Button
                onClick={() => navigate('/users')}
                className="w-full justify-start gap-3 bg-muted hover:bg-muted/80"
              >
                <span className="text-lg">👥</span>
                <span>إدارة المستخدمين والصلاحيات</span>
              </Button>
              <Button
                onClick={() => navigate('/clients')}
                className="w-full justify-start gap-3 bg-muted hover:bg-muted/80"
              >
                <span className="text-lg">🏢</span>
                <span>إدارة العملاء والمصانع</span>
              </Button>
              <Button
                onClick={() => navigate('/settings')}
                className="w-full justify-start gap-3 bg-muted hover:bg-muted/80"
              >
                <span className="text-lg">⚙️</span>
                <span>إعدادات النظام</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}