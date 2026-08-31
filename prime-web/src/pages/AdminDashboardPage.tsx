import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const adminStats = useAppStore((s) => s.adminStats)
  const setAdminStats = useAppStore((s) => s.setAdminStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemHealth, setSystemHealth] = useState<import('@/lib/types').SystemHealthDto | null>(null)
  const [backupHistory, setBackupHistory] = useState<import('@/lib/types').BackupHistoryDto[]>([])

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        setLoading(true)
        const stats = await api.dashboard.adminStats()
        if (!cancelled) setAdminStats(stats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [setAdminStats])

  useEffect(() => {
    let cancelled = false
    const fetchHealth = async () => {
      try {
        const health = await api.admin.health()
        if (!cancelled) setSystemHealth(health)
      } catch {
        // silent
      }
    }
    fetchHealth()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchHistory = async () => {
      try {
        const history = await api.admin.backupHistory()
        if (!cancelled) setBackupHistory(history)
      } catch {
        // silent
      }
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [])

  const handleExportBackup = async () => {
    try {
      const blob = await api.admin.exportBackup()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prime-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export backup')
    }
  }

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

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!adminStats) return null

  const lastBackupDate = systemHealth?.lastBackupAt
    ? new Date(systemHealth.lastBackupAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'لا توجد نسخة احتياطية'

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير العام</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            نظرة شاملة على صحة النظام — مستخدمين، عملاء، وإعدادات
          </p>
        </div>
      </div>

      {/* KPIs Grid - 2 Cards: Users & Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-8">
        {/* Card 1: Total Users */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="pb-2">
            <h3 className="text-[11px] font-bold text-muted-foreground tracking-wide">
              إجمالي المستخدمين
            </h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">
                  {adminStats.totalUsers}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                  حسابات مسجلة في النظام
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 pt-0 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30">
                <p className="text-[10px] font-bold text-muted-foreground">نشطون</p>
                <p className="mt-1 text-2xl font-black text-green-700 dark:text-green-400 tabular-nums">
                  {adminStats.activeUsers}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30">
                <p className="text-[10px] font-bold text-muted-foreground">معطلون</p>
                <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-400 tabular-nums">
                  {adminStats.inactiveUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Clients */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="pb-2">
            <h3 className="text-[11px] font-bold text-muted-foreground tracking-wide">
              إجمالي العملاء
            </h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">
                  {adminStats.totalClients}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                  عملاء مسجلون في النظام
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 pt-0 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30">
                <p className="text-[10px] font-bold text-muted-foreground">نشطون</p>
                <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-400 tabular-nums">
                  {adminStats.activeClients}
                </p>
                <p className="text-[10px] text-muted-foreground">لديهم طلبات نشطة</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-900/30">
                <p className="text-[10px] font-bold text-muted-foreground">إجمالي المصانع</p>
                <p className="mt-1 text-2xl font-black text-gray-700 dark:text-gray-400 tabular-nums">
                  {adminStats.totalPlants}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health & Database Backup Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card: System & Neon DB Health */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-bold text-primary">حالة النظام وقاعدة البيانات</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">قاعدة البيانات (Neon PostgreSQL)</span>
              <Badge variant={systemHealth?.status === 'سليم' ? 'default' : 'destructive'}>
                {systemHealth?.status ?? 'جارٍ التحميل...'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">زمن الاستجابة</p>
                <p className={`font-bold tabular-nums ${systemHealth?.databaseLatencyMs && systemHealth.databaseLatencyMs < 50 ? 'text-green-700' : systemHealth?.databaseLatencyMs && systemHealth.databaseLatencyMs < 200 ? 'text-blue-700' : 'text-amber-700'}`}>
                  {systemHealth?.databaseLatencyMs ?? 0} ms
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {systemHealth?.databaseLatencyMs && systemHealth.databaseLatencyMs < 50 ? 'ممتاز' : systemHealth?.databaseLatencyMs && systemHealth.databaseLatencyMs < 200 ? 'طبيعي' : 'بطيء / بدء بارد'}
                </p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">وقت تشغيل الخادم</p>
                <p className="font-mono text-xs">{systemHealth?.serverUptime ?? '-'}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">البيئة</p>
                <p className="font-medium capitalize">{systemHealth?.environment ?? 'production'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Database Backup & Records */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold">قاعدة البيانات والنسخ الاحتياطية</h3>
            <Button onClick={handleExportBackup} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              تصدير نسخة احتياطية
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">إجمالي السجلات</p>
                <p className="font-bold tabular-nums">
                  {systemHealth?.tableCounts ? (
                    (systemHealth.tableCounts.users + systemHealth.tableCounts.clients + 
                    systemHealth.tableCounts.plants + systemHealth.tableCounts.requisitions + 
                    systemHealth.tableCounts.auditLogs + systemHealth.tableCounts.attachments + 
                    systemHealth.tableCounts.notifications + systemHealth.tableCounts.permissions).toLocaleString() 
                  ) : '—'}
                  </p>
                </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">آخر نسخة احتياطية</p>
                <p className="font-medium">{lastBackupDate}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">إجمالي النسخ الاحتياطية</p>
                <p className="font-bold">{backupHistory.length}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-bold mb-3">تاريخ النسخ الاحتياطية</h4>
              {backupHistory.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-border">
                  {backupHistory.map((backup) => (
                    <div key={backup.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{new Date(backup.createdAt).toLocaleString('ar-SA')}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">{backup.notes}</p>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        {backup.fileSize ? `${(backup.fileSize / 1024).toFixed(1)} KB` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد نسخ احتياطية سابقة</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users & Clients Cards Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card: Users */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-bold">المستخدمون</h3>
            <Button onClick={() => navigate('/users')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              إدارة المستخدمين
            </Button>
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
                        <p className="text-[11px] text-muted-foreground font-mono">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </Badge>
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
        </div>

        {/* Card: Clients */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-bold">العملاء</h3>
            <Button onClick={() => navigate('/clients')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              إدارة العملاء
            </Button>
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
                        <p className="text-[10px] text-muted-foreground font-bold tracking-wide">طلبات</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-black tabular-nums text-green-700 dark:text-green-400">{client.wonCount}</p>
                        <p className="text-[10px] text-muted-foreground font-bold tracking-wide">فائزة</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد بيانات عملاء</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}