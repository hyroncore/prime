import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateShort, getUrgencyMeta, STATUS_META } from '@/lib/format'
import type { RequisitionStatus } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/lib/api'

const FUNNEL_ORDER: RequisitionStatus[] = [
  'NEW',
  'REVIEW',
  'PROCESSING',
  'SUBMITTED',
  'WON',
  'LOST',
  'DECLINED',
]

export function ManagerDashboardPage() {
  const navigate = useNavigate()
  const setManagerStats = useAppStore((s) => s.setManagerStats)
  const managerStats = useAppStore((s) => s.managerStats)
  const loading = useAppStore((s) => s.loading)
  const openDrawer = useAppStore((s) => s.openDrawer)
  const setLoading = useAppStore((s) => s.setLoading)
  const setError = useAppStore((s) => s.setError)

  useEffect(() => {
    let cancelled = false
    const fetchStats = async () => {
      try {
        setLoading(true)
        const stats = await api.dashboard.managerStats()
        if (!cancelled) setManagerStats(stats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [setManagerStats, setLoading, setError])

  if (loading && !managerStats) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-7">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-t border-border first:border-t-0">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
          <div className="xl:col-span-5 space-y-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-28 rounded mb-2" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!managerStats) return null

  const funnelCounts: Record<RequisitionStatus, number> = {
    NEW: managerStats.teamPerformance.reduce((sum, m) => sum + m.openRequisitions, 0),
    REVIEW: managerStats.pendingReview,
    PROCESSING: managerStats.pendingReview,
    SUBMITTED: managerStats.pendingSignOff,
    WON: managerStats.wonCount,
    LOST: managerStats.lostCount,
    DECLINED: 0,
  }

  const funnelTotal = FUNNEL_ORDER.reduce((sum, s) => sum + funnelCounts[s], 0)

  const kpis = [
    {
      title: 'حجم فريق العمل',
      value: String(managerStats.teamVolume),
      subtitle: 'إجمالي طلبات الفريق',
    },
    {
      title: 'بانتظار مراجعة المدير',
      value: String(managerStats.pendingReview),
      subtitle: 'تحتاج إلى قرار (موافقة/تعديل)',
      accent: managerStats.pendingReview > 0,
    },
    {
      title: 'بانتظار اعتماد داخلي',
      value: String(managerStats.pendingSignOff),
      subtitle: 'مُراجعة، بانتظار الاعتماد النهائي',
      accent: managerStats.pendingSignOff > 0,
    },
    {
      title: 'نسبة فوز الفريق',
      value: `${managerStats.teamWinRate}%`,
      subtitle: `${managerStats.wonCount} فائزة / ${managerStats.lostCount} خاسرة`,
    },
  ]

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            متابعة أداء الفريق وطلبات المراجعة المعلقة
          </p>
        </div>
        <Button
          onClick={() => navigate('/requisitions')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
        >
          عرض جميع الطلبات
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8">
        {kpis.map((stat, i) => (
          <div
            key={i}
            className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0"
          >
            <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
              {stat.title}
            </p>
            <p
              className={
                'mt-2 text-4xl font-black tabular-nums tracking-tight' +
                (stat.accent ? ' text-red-700 dark:text-red-400' : '')
              }
            >
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">
              {stat.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold text-muted-foreground tracking-wide">
          توزيع حالات فريق العمل
        </p>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          {funnelTotal > 0 &&
            FUNNEL_ORDER.map((status) => {
              const count = funnelCounts[status]
              if (count === 0) return null
              return (
                <div
                  key={status}
                  title={`${STATUS_META[status].label}: ${count}`}
                  className={`${STATUS_META[status].badgeClass} h-full`}
                  style={{ width: `${(count / funnelTotal) * 100}%` }}
                />
              )
            })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {FUNNEL_ORDER.map((status) => {
            const count = funnelCounts[status]
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${STATUS_META[status].badgeClass}`}
                />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {STATUS_META[status].label}
                </span>
                <span className="text-[11px] font-black tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-7 space-y-10">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                طلبات بانتظار مراجعتك
              </p>
              <span className="text-[11px] text-muted-foreground">
                مرتبة حسب تاريخ الاستحقاق
              </span>
            </div>
            <div className="divide-y divide-border">
              {managerStats.pendingReviews.length > 0 ? (
                managerStats.pendingReviews.map((req) => {
                  const urgency = getUrgencyMeta(req.daysLeft)
                  const overdue = req.daysLeft < 0
                  return (
                    <div
                      key={req.id}
                      onClick={() => openDrawer(req.id)}
                      className="flex items-center gap-4 -mx-4 cursor-pointer rounded-lg px-4 py-3.5 transition-colors hover:bg-muted/40"
                    >
                      <span
                        dir="ltr"
                        className="w-28 shrink-0 font-mono text-sm font-bold text-primary"
                      >
                        {req.identifier}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{req.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground font-medium">
                          {req.clientName} · {req.plantName}
                        </p>
                      </div>
                      <div className="hidden shrink-0 sm:block">
                        <StatusBadge status={req.status as RequisitionStatus} />
                      </div>
                      <div className="shrink-0 text-left">
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            overdue ? 'text-red-700 dark:text-red-400' : ''
                          }`}
                        >
                          {formatDateShort(req.dueDate)}
                        </p>
                        <p
                          className={`text-[11px] font-bold ${
                            overdue
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {urgency.label}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد طلبات بانتظار المراجعة
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                طلبات بانتظار الاعتماد النهائي (SUBMITTED)
              </p>
              <span className="text-[11px] text-muted-foreground">
                مرتبة حسب تاريخ التقديم
              </span>
            </div>
            <div className="divide-y divide-border">
              {managerStats.pendingSignOffs.length > 0 ? (
                managerStats.pendingSignOffs.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => openDrawer(req.id)}
                    className="flex items-center gap-4 -mx-4 cursor-pointer rounded-lg px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span
                      dir="ltr"
                      className="w-28 shrink-0 font-mono text-sm font-bold text-primary"
                    >
                      {req.identifier}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{req.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground font-medium">
                        {req.clientName} · {req.plantName}
                      </p>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                      <StatusBadge status="SUBMITTED" />
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-sm font-bold tabular-nums">
                        {formatDateShort(req.submittedAt)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-bold">
                        تم التقديم
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  لا توجد طلبات بانتظار الاعتماد
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-10">
          <Card>
            <div className="p-4 border-b border-border">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                أداء أعضاء الفريق
              </p>
            </div>
            <div className="p-4">
              {managerStats.teamPerformance.length > 0 ? (
                <div className="space-y-4">
                  {managerStats.teamPerformance.map((member) => (
                    <div key={member.userId} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-bold">{member.displayName}</p>
                        <p className="text-[11px] text-muted-foreground font-bold tabular-nums">
                          نسبة الفوز: {member.winRate}%
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-black">{member.openRequisitions}</p>
                          <p className="text-[10px] text-muted-foreground">نشطة</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-black text-amber-700 dark:text-amber-400">
                            {member.reviseCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">تعديل</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-black text-blue-700 dark:text-blue-400">
                            {member.submittedCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">مُقدمة</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-black text-green-700 dark:text-green-400">
                            {member.wonCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">فائزة</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد بيانات لأعضاء الفريق
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-border">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                ملخص الفوز/الخسارة
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs font-bold">
                    <span className="text-green-600">فائزة</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-bold tabular-nums">
                    {managerStats.wonCount}
                  </p>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{
                      width: `${
                        managerStats.wonCount + managerStats.lostCount > 0
                          ? Math.round(
                              (managerStats.wonCount / (managerStats.wonCount + managerStats.lostCount)) * 100
                            )
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs font-bold">
                    <span className="text-red-600">خاسرة</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-bold tabular-nums">
                    {managerStats.lostCount}
                  </p>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-600"
                    style={{
                      width: `${
                        managerStats.wonCount + managerStats.lostCount > 0
                          ? Math.round(
                              (managerStats.lostCount / (managerStats.wonCount + managerStats.lostCount)) * 100
                            )
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs font-bold">
                    <span className="text-blue-600">نسبة الفوز</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-bold tabular-nums">
                    {managerStats.teamWinRate}%
                  </p>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${managerStats.teamWinRate}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}