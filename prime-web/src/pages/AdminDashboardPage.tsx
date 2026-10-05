import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatRelativeTime } from '@/lib/format'
import type { BackupHistoryResponseDto, SystemHealthDto } from '@/lib/types'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'

const numberFormatter = new Intl.NumberFormat('ar')

function getTotalRecords(health: SystemHealthDto | null) {
  if (!health) return null
  const { tableCounts } = health
  return (
    tableCounts.users +
    tableCounts.clients +
    tableCounts.plants +
    tableCounts.requisitions +
    tableCounts.auditLogs +
    tableCounts.attachments +
    tableCounts.notifications +
    tableCounts.permissions
  )
}

function getLatencyLabel(latencyMs: number) {
  if (latencyMs > 200) return 'بطيء، قد يكون السبب بدء تشغيل بارد'
  if (latencyMs >= 50) return 'زمن استجابة متوسط'
  return 'زمن استجابة جيد'
}

function getHealthBadgeClass(status: string) {
  if (status === 'سليم') {
    return 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'
  }
  if (status === 'متدهور') {
    return 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
  }
  return 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400'
}

function getHealthDotClass(status: string) {
  if (status === 'سليم') return 'bg-green-600 dark:bg-green-400'
  if (status === 'متدهور') return 'bg-amber-600 dark:bg-amber-400'
  return 'bg-red-600 dark:bg-red-400'
}

function formatBackupDate(date: string) {
  return new Date(date).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminDashboardPage() {
  const { toast } = useToast()
  const adminStats = useAppStore((state) => state.adminStats)
  const setAdminStats = useAppStore((state) => state.setAdminStats)

  const [statsLoading, setStatsLoading] = useState(!adminStats)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealthDto | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryResponseDto>({
    totalCount: 0,
    items: [],
  })
  const [backupHistoryLoading, setBackupHistoryLoading] = useState(true)
  const [backupHistoryError, setBackupHistoryError] = useState<string | null>(null)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [liveUptime, setLiveUptime] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        const stats = await api.dashboard.adminStats()
        if (!cancelled) {
          setAdminStats(stats)
          setStatsError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setStatsError(
            error instanceof Error ? error.message : 'تعذر تحميل إحصاءات لوحة التحكم.',
          )
        }
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [setAdminStats])

  useEffect(() => {
    let cancelled = false

    const loadHealth = async () => {
      try {
        const health = await api.admin.health()
        if (!cancelled) {
          setSystemHealth(health)
          setHealthError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setHealthError(
            error instanceof Error ? error.message : 'تعذر تحميل حالة النظام.',
          )
        }
      } finally {
        if (!cancelled) setHealthLoading(false)
      }
    }

    loadHealth()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadBackupHistory = async () => {
      try {
        const history = await api.admin.backupHistory()
        if (!cancelled) {
          setBackupHistory(history)
          setBackupHistoryError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setBackupHistoryError(
            error instanceof Error ? error.message : 'تعذر تحميل سجل النسخ الاحتياطية.',
          )
        }
      } finally {
        if (!cancelled) setBackupHistoryLoading(false)
      }
    }

    loadBackupHistory()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!systemHealth?.serverStartedAt) return

    const startTime = new Date(systemHealth.serverStartedAt).getTime()
    const updateUptime = () => {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (days > 0) {
        setLiveUptime(`${days} يوم، ${hours} ساعة، ${minutes} دقيقة`)
      } else if (hours > 0) {
        setLiveUptime(`${hours} ساعة، ${minutes} دقيقة`)
      } else if (minutes > 0) {
        setLiveUptime(`${minutes} دقيقة، ${seconds} ثانية`)
      } else {
        setLiveUptime(`${seconds} ثانية`)
      }
    }

    updateUptime()
    const intervalId = window.setInterval(updateUptime, 1000)
    return () => window.clearInterval(intervalId)
  }, [systemHealth?.serverStartedAt])

  const handleExportBackup = async () => {
    setExportingBackup(true)
    setExportError(null)

    try {
      const blob = await api.admin.exportBackup()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `prime-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)

      toast({ title: 'تم تصدير النسخة الاحتياطية بنجاح' })

      const [historyResult, healthResult] = await Promise.allSettled([
        api.admin.backupHistory(),
        api.admin.health(),
      ])
      if (historyResult.status === 'fulfilled') {
        setBackupHistory(historyResult.value)
        setBackupHistoryError(null)
      } else {
        setBackupHistoryError(
          historyResult.reason instanceof Error
            ? historyResult.reason.message
            : 'تعذر تحديث سجل النسخ الاحتياطية.',
        )
      }
      if (healthResult.status === 'fulfilled') {
        setSystemHealth(healthResult.value)
        setHealthError(null)
      } else {
        setHealthError(
          healthResult.reason instanceof Error
            ? healthResult.reason.message
            : 'تعذر تحديث حالة النظام.',
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر تصدير النسخة الاحتياطية.'
      setExportError(message)
      toast({ title: message, variant: 'destructive' })
    } finally {
      setExportingBackup(false)
    }
  }

  const totalRecords = getTotalRecords(systemHealth)
  const lastBackup = systemHealth?.lastBackupAt
    ? formatBackupDate(systemHealth.lastBackupAt)
    : null

  return (
    <main dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">لوحة تحكم مدير النظام</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">نظرة سريعة على حالة النظام وبياناته</p>
      </header>

      <section aria-labelledby="system-summary-heading" className="space-y-3">
        <h2 id="system-summary-heading" className="text-sm font-black">ملخص النظام</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">
            إجمالي المستخدمين
          </p>
          {statsLoading && !adminStats ? (
            <Skeleton className="h-8 w-16 rounded" />
          ) : (
            <p className="text-start text-2xl font-black tabular-nums">
              {adminStats ? numberFormatter.format(adminStats.totalUsers) : '—'}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">
            إجمالي العملاء
          </p>
          {statsLoading && !adminStats ? (
            <Skeleton className="h-8 w-16 rounded" />
          ) : (
            <p className="text-start text-2xl font-black tabular-nums">
              {adminStats ? numberFormatter.format(adminStats.totalClients) : '—'}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">
            إجمالي السجلات
          </p>
          {healthLoading && !systemHealth ? (
            <Skeleton className="h-8 w-16 rounded" />
          ) : (
            <p className="text-start text-2xl font-black tabular-nums">
              {totalRecords === null ? '—' : numberFormatter.format(totalRecords)}
            </p>
          )}
        </Card>
        </div>
      </section>

      {statsError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {statsError}
        </p>
      )}

      <section
        aria-label="حالة النظام والنسخ الاحتياطية"
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
      >
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-black">حالة النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthError ? (
              <p role="alert" className="text-sm text-destructive">{healthError}</p>
            ) : healthLoading && !systemHealth ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : systemHealth ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-semibold">قاعدة البيانات</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Neon PostgreSQL</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-2 rounded-full py-0 ${getHealthBadgeClass(systemHealth.status)}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${getHealthDotClass(systemHealth.status)}`}
                    />
                    {systemHealth.status}
                  </Badge>
                </div>

                <dl className="divide-y divide-border">
                  <div className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
                    <dt className="text-xs font-bold text-muted-foreground">زمن الاستجابة</dt>
                    <dd className="text-end">
                      <p className="text-sm font-semibold tabular-nums">
                        {numberFormatter.format(systemHealth.databaseLatencyMs)} مللي ثانية
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getLatencyLabel(systemHealth.databaseLatencyMs)}
                      </p>
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <dt className="text-xs font-bold text-muted-foreground">مدة تشغيل الخادم</dt>
                    <dd className="text-sm font-semibold">{liveUptime || systemHealth.serverUptime}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3 last:pb-0">
                    <dt className="text-xs font-bold text-muted-foreground">البيئة</dt>
                    <dd className="text-sm font-semibold">{systemHealth.environment}</dd>
                  </div>
                </dl>
                {systemHealth.databaseError && (
                  <p className="border-t border-border pt-3 text-xs text-destructive">
                    {systemHealth.databaseError}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">لا تتوفر بيانات حالة النظام.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-black">النسخ الاحتياطية</CardTitle>
            <Button
              onClick={handleExportBackup}
              disabled={exportingBackup}
              aria-busy={exportingBackup}
              className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            >
              {exportingBackup ? 'جارٍ التصدير…' : 'تصدير نسخة احتياطية'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportError && (
              <p role="alert" className="text-sm text-destructive">{exportError}</p>
            )}

            {!backupHistoryLoading && !backupHistoryError && backupHistory.totalCount === 0 && (
              <p className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                لا توجد نسخة احتياطية بعد. صدّر نسخة لحماية بياناتك.
              </p>
            )}

            <dl className="grid gap-4 border-b border-border pb-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-bold text-muted-foreground">آخر نسخة احتياطية</dt>
                <dd className="text-sm font-semibold">
                  {lastBackup ?? (healthLoading ? 'جارٍ التحميل…' : 'لا توجد نسخة بعد')}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-bold text-muted-foreground">إجمالي النسخ</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {backupHistoryLoading
                    ? '…'
                    : numberFormatter.format(backupHistory.totalCount)}
                </dd>
              </div>
            </dl>

            <div className="space-y-3">
              <h2 className="text-xs font-bold tracking-wide text-muted-foreground">
                سجل النسخ الاحتياطية
              </h2>
              {backupHistoryError ? (
                <p role="alert" className="text-sm text-destructive">{backupHistoryError}</p>
              ) : backupHistoryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              ) : backupHistory.items.length > 0 ? (
                <ul className="divide-y divide-border">
                  {backupHistory.items.map((backup) => (
                    <li
                      key={backup.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{formatBackupDate(backup.createdAt)}</p>
                        <p className="truncate text-xs text-muted-foreground">{backup.notes}</p>
                      </div>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {backup.fileSize
                          ? `${(backup.fileSize / 1024).toFixed(1)} KB`
                          : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-muted/40 px-4 py-5 text-center">
                  <h3 className="text-sm font-semibold">لا يوجد سجل للنسخ الاحتياطية</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ستظهر النسخ التي تصدّرها هنا مع تاريخ التصدير وحجم الملف.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        aria-label="المستخدمون والعملاء"
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
      >
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-black">المستخدمون</CardTitle>
          </CardHeader>
          {adminStats?.recentUsers.length ? (
            <Table className="min-w-[560px]">
              <TableCaption className="sr-only">قائمة المستخدمين وحالة الحساب ووقت آخر تسجيل دخول</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">المستخدم</TableHead>
                  <TableHead scope="col" className="text-center">الحالة</TableHead>
                  <TableHead scope="col" className="text-center">آخر دخول</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminStats.recentUsers.map((user) => (
                  <TableRow key={user.id} className="motion-reduce:transition-none">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground"
                        >
                          {(user.displayName || user.username).trim().charAt(0).toLocaleUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {user.displayName || user.username}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground" dir="ltr">
                            @{user.username}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? 'rounded-full border-green-200 bg-green-100 py-0 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'
                            : 'rounded-full border-gray-200 bg-gray-100 py-0 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'
                        }
                      >
                        {user.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'لم يسجل دخول بعد'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <p className="py-4 text-center text-sm text-muted-foreground">
                {statsLoading
                  ? 'جارٍ تحميل المستخدمين…'
                  : statsError
                    ? 'تعذر تحميل المستخدمين.'
                    : 'لا يوجد مستخدمون لعرضهم.'}
              </p>
            </CardContent>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-black">العملاء</CardTitle>
          </CardHeader>
          {adminStats?.topClients.length ? (
            <Table className="min-w-[360px]">
              <TableCaption className="sr-only">قائمة العملاء وعدد طلباتهم</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">العميل</TableHead>
                  <TableHead scope="col" className="text-start">الطلبات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminStats.topClients.map((client) => (
                  <TableRow key={client.id} className="motion-reduce:transition-none">
                    <TableCell className="font-semibold">{client.name}</TableCell>
                    <TableCell className="text-start text-sm font-bold tabular-nums" dir="rtl">
                      {numberFormatter.format(client.totalRequisitions)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <p className="py-4 text-center text-sm text-muted-foreground">
                {statsLoading
                  ? 'جارٍ تحميل العملاء…'
                  : statsError
                    ? 'تعذر تحميل العملاء.'
                    : 'لا توجد بيانات عملاء لعرضها.'}
              </p>
            </CardContent>
          )}
        </Card>
      </section>
    </main>
  )
}
