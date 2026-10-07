import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatRelativeTime } from '@/lib/format'
import type { BackupHistoryResponseDto, SystemHealthDto } from '@/lib/types'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'

const numberFormatter = new Intl.NumberFormat('ar')

const HEALTH_STATUS_CLASSES: Record<string, string> = {
  سليم: 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400',
  متدهور:
    'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  'غير متاح':
    'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
}

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
  if (latencyMs > 200) return 'استجابة بطيئة'
  if (latencyMs >= 50) return 'استجابة متوسطة'
  return 'استجابة جيدة'
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

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days} يوم، ${hours} ساعة`
  if (hours > 0) return `${hours} ساعة، ${minutes} دقيقة`
  return `${minutes} دقيقة`
}

function DashboardMetric({
  label,
  value,
  loading,
}: {
  label: string
  value: number | null
  loading: boolean
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      {loading && value === null ? (
        <Skeleton className="mt-2 h-8 w-20 rounded" />
      ) : (
        <p className="mt-2 text-2xl font-black tabular-nums">
          {value === null ? '—' : numberFormatter.format(value)}
        </p>
      )}
    </Card>
  )
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  )
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

    void loadDashboard()
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
          setHealthError(error instanceof Error ? error.message : 'تعذر تحميل حالة النظام.')
        }
      } finally {
        if (!cancelled) setHealthLoading(false)
      }
    }

    void loadHealth()
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

    void loadBackupHistory()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!systemHealth?.serverStartedAt) return

    const startTime = new Date(systemHealth.serverStartedAt).getTime()
    const updateUptime = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      setLiveUptime(formatUptime(seconds))
    }

    updateUptime()
    const intervalId = window.setInterval(updateUptime, 60_000)
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
  const metrics = [
    {
      label: 'المستخدمون',
      value: adminStats?.totalUsers ?? null,
      loading: statsLoading,
    },
    {
      label: 'الشركات',
      value: adminStats?.totalClients ?? null,
      loading: statsLoading,
    },
    {
      label: 'إجمالي السجلات',
      value: totalRecords,
      loading: healthLoading,
    },
  ]
  const lastBackup = systemHealth?.lastBackupAt
    ? formatBackupDate(systemHealth.lastBackupAt)
    : null
  const healthBadgeClass =
    HEALTH_STATUS_CLASSES[systemHealth?.status ?? ''] ??
    'border-border bg-muted text-muted-foreground'

  return (
    <main dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">لوحة تحكم مدير النظام</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          نظرة عامة على النظام والمستخدمين والنسخ الاحتياطية
        </p>
      </header>

      <section aria-label="ملخص النظام" className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <DashboardMetric key={metric.label} {...metric} />
        ))}
      </section>

      {statsError && (
        <Card className="border-destructive/30 p-4">
          <ErrorMessage>{statsError}</ErrorMessage>
        </Card>
      )}

      <section aria-labelledby="system-health-heading">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle id="system-health-heading" className="text-sm font-black">
              حالة النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthError && <ErrorMessage>{healthError}</ErrorMessage>}
            {healthLoading && !systemHealth ? (
              <div className="space-y-4" aria-label="جارٍ تحميل حالة النظام">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : systemHealth ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold">قاعدة البيانات</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Neon PostgreSQL</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full py-0 ${healthBadgeClass}`}
                  >
                    {systemHealth.status}
                  </Badge>
                </div>

                <dl className="divide-y divide-border">
                  <div className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <dt className="text-xs font-bold text-muted-foreground">زمن استجابة قاعدة البيانات</dt>
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
                    <dd className="text-sm font-semibold">
                      {liveUptime || systemHealth.serverUptime}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-3 last:pb-0">
                    <dt className="text-xs font-bold text-muted-foreground">بيئة التشغيل</dt>
                    <dd className="text-sm font-semibold">{systemHealth.environment}</dd>
                  </div>
                </dl>
                {systemHealth.databaseError && (
                  <p role="alert" className="border-t border-border pt-3 text-sm text-destructive">
                    {systemHealth.databaseError}
                  </p>
                )}
              </>
            ) : (
              !healthError && (
                <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                  لا تتوفر بيانات حالة النظام.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="backups-heading">
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle id="backups-heading" className="text-sm font-black">
                النسخ الاحتياطية
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                تصدير نسخة من بيانات النظام بصيغة JSON.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void handleExportBackup()}
              disabled={exportingBackup}
              aria-busy={exportingBackup}
              className="min-h-11 w-full text-xs font-bold sm:w-auto"
            >
              {exportingBackup ? 'جارٍ إنشاء النسخة...' : 'تصدير نسخة احتياطية'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {exportError && <ErrorMessage>{exportError}</ErrorMessage>}

            <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-bold text-muted-foreground">آخر نسخة احتياطية</dt>
                <dd className="text-sm font-semibold">
                  {lastBackup ?? (healthLoading ? 'جارٍ التحميل...' : 'لا توجد نسخة بعد')}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-bold text-muted-foreground">عدد النسخ</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {backupHistoryLoading ? (
                    <Skeleton className="h-5 w-12 rounded" />
                  ) : backupHistoryError ? (
                    '—'
                  ) : (
                    numberFormatter.format(backupHistory.totalCount)
                  )}
                </dd>
              </div>
            </dl>

            <div className="space-y-3 border-t border-border pt-4">
              <h2 className="text-sm font-bold">سجل النسخ</h2>
              {backupHistoryError ? (
                <ErrorMessage>{backupHistoryError}</ErrorMessage>
              ) : backupHistoryLoading ? (
                <div className="space-y-3" aria-label="جارٍ تحميل سجل النسخ الاحتياطية">
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
                        <p className="text-sm font-semibold">
                          {formatBackupDate(backup.createdAt)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{backup.notes}</p>
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                        {backup.fileSize ? `${(backup.fileSize / 1024).toFixed(1)} KB` : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  لا توجد نسخ احتياطية مسجلة بعد.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="users-heading" className="min-w-0">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle id="users-heading" className="text-sm font-black">
                أحدث المستخدمين
              </CardTitle>
            </CardHeader>
            {adminStats?.recentUsers.length ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[480px]">
                  <TableCaption className="sr-only">
                    المستخدمون وحالة الحساب ووقت آخر تسجيل دخول
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead scope="col">المستخدم</TableHead>
                      <TableHead scope="col" className="text-center">الحالة</TableHead>
                      <TableHead scope="col" className="text-center">آخر دخول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminStats.recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {user.displayName || user.username}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                              @{user.username}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              user.isActive
                                ? 'rounded-full border-green-200 bg-green-100 py-0 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'
                                : 'rounded-full border-border bg-muted py-0 text-muted-foreground'
                            }
                          >
                            {user.isActive ? 'نشط' : 'معطل'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {user.lastLoginAt
                            ? formatRelativeTime(user.lastLoginAt)
                            : 'لم يسجل دخول بعد'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <CardContent className="border-t border-border pt-4">
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {statsLoading
                    ? 'جارٍ تحميل المستخدمين...'
                    : statsError
                      ? 'تعذر تحميل بيانات المستخدمين.'
                      : 'لا يوجد مستخدمون لعرضهم.'}
                </p>
              </CardContent>
            )}
          </Card>
        </section>

        <section aria-labelledby="clients-heading" className="min-w-0">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle id="clients-heading" className="text-sm font-black">
                أكثر الشركات طلباً
              </CardTitle>
            </CardHeader>
            {adminStats?.topClients.length ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[320px]">
                  <TableCaption className="sr-only">
                    الشركات وعدد الطلبات المسجلة
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead scope="col">الشركة</TableHead>
                      <TableHead scope="col" className="text-center">الطلبات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminStats.topClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="text-sm font-semibold">{client.name}</TableCell>
                        <TableCell className="text-center text-sm font-semibold tabular-nums">
                          {numberFormatter.format(client.totalRequisitions)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <CardContent className="border-t border-border pt-4">
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {statsLoading
                    ? 'جارٍ تحميل بيانات الشركات...'
                    : statsError
                      ? 'تعذر تحميل بيانات الشركات.'
                      : 'لا توجد بيانات شركات لعرضها.'}
                </p>
              </CardContent>
            )}
          </Card>
        </section>
      </div>
    </main>
  )
}
