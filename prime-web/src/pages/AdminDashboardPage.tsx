import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
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
        // Clear global error on success
        useAppStore.getState().setError(null)
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
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24 rounded mb-3" />
              <Skeleton className="h-7 w-32 rounded mb-1" />
              <Skeleton className="h-3 w-20 rounded" />
            </Card>
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير العام</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            نظرة شاملة على صحة النظام — مستخدمين، عملاء، وإعدادات
          </p>
        </div>
      </div>

      {/* KPIs Grid - 2 Cards: Users & Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Total Users */}
        <Card className="p-5">
          <p className="text-xs font-bold text-muted-foreground tracking-wide mb-2">
            إجمالي المستخدمين
          </p>
          <div className="text-2xl font-black">{adminStats.totalUsers}</div>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            حسابات مسجلة في النظام
          </p>
        </Card>

        {/* Card 2: Total Clients */}
        <Card className="p-5">
          <p className="text-xs font-bold text-muted-foreground tracking-wide mb-2">
            إجمالي العملاء
          </p>
          <div className="text-2xl font-black">{adminStats.totalClients}</div>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            عملاء مسجلون في النظام
          </p>
        </Card>
      </div>

      {/* System Health & Database Backup Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card: System & Neon DB Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary">حالة النظام وقاعدة البيانات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Card: Database Backup & Records */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">قاعدة البيانات والنسخ الاحتياطية</CardTitle>
            <Button onClick={handleExportBackup} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              تصدير نسخة احتياطية
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>

      {/* Users & Clients Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Table: Users */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">المستخدمون</CardTitle>
            <Button onClick={() => navigate('/users')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              إدارة المستخدمين
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {adminStats.recentUsers && adminStats.recentUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 w-[40px]">#</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4">الاسم</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4">المستخدم</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 text-center">الحالة</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 text-center">آخر دخول</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminStats.recentUsers.map((user) => (
                    <TableRow key={user.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-4 py-3.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-sm font-bold text-primary">
                            {user.displayName?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <p className="text-sm font-semibold">{user.displayName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">@{user.username}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center">
                        <Badge variant={user.isActive ? 'default' : 'secondary'} className="rounded-full py-0">
                          {user.isActive ? 'نشط' : 'معطل'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-sm text-muted-foreground">
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'لم يسجل دخول'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">لا يوجد مستخدمون</p>
            )}
          </CardContent>
        </Card>

        {/* Table: Clients */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">العملاء</CardTitle>
            <Button onClick={() => navigate('/clients')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
              إدارة العملاء
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {adminStats.topClients && adminStats.topClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 w-[40px]">#</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4">العميل</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 text-center">الطلبات</TableHead>
                    <TableHead className="text-[11px] font-bold text-muted-foreground tracking-wider h-10 px-4 text-center">الفائزة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminStats.topClients.map((client) => (
                    <TableRow key={client.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-4 py-3.5">
                        <p className="truncate text-sm font-bold">{client.name}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-base font-black tabular-nums">
                        {client.totalRequisitions}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-base font-black tabular-nums text-green-700 dark:text-green-400">
                        {client.wonCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات عملاء</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}