import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateShort, getUrgencyMeta } from '@/lib/format'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'

const numberFormatter = new Intl.NumberFormat('ar')

const PAGE_TEXT = {
  title: 'لوحة معلومات المستخدم',
  description: 'ملخص طلباتك والمهام التي تحتاج إلى متابعتك.',
  createRequest: 'طلب شراء جديد',
  metrics: 'ملخص الطلبات',
  active: 'طلباتي النشطة',
  activeDescription: 'مسودات وطلبات قيد المتابعة',
  drafts: 'المسودات',
  draftsDescription: 'لم تُرسل للمراجعة بعد',
  review: 'بانتظار المراجعة',
  reviewDescription: 'طلباتك لدى المدير لمراجعة العمل',
  signOff: 'بانتظار الاعتماد الداخلي',
  signOffDescription: 'تم إرسال طلب الاعتماد إلى المدير',
  revision: 'تتطلب تعديلاً',
  revisionDescription: 'أُعيدت إليك مع ملاحظات',
  overdue: 'الطلبات المتأخرة',
  overdueDescription: 'تجاوزت تاريخ الاستحقاق',
  actionRequired: 'طلبات تحتاج إلى إجراء',
  actionRequiredDescription: 'أكمل التعديلات أو تابع خطوات الاعتماد والإرسال.',
  noActionRequired: 'لا توجد طلبات تتطلب إجراءً حالياً.',
  openRequest: (identifier: string, title: string) => `فتح الطلب ${identifier}: ${title}`,
  outcomes: 'النتائج',
  won: 'طلبات فائزة',
  lost: 'طلبات غير فائزة',
  winRate: 'نسبة الفوز',
  emptyTitle: 'لا توجد طلبات شراء بعد',
  emptyDescription: 'أنشئ أول طلب شراء لك لمتابعة حالته ومواعيد استحقاقه هنا.',
  loadError: 'تعذر تحميل بيانات لوحة المعلومات.',
  retry: 'إعادة المحاولة',
  retrying: 'جارٍ التحديث…',
  unavailable: 'لا تتوفر بيانات لوحة المعلومات حالياً.',
} as const

interface DashboardMetric {
  title: string
  value: number
  description: string
  attention?: boolean
}

function DashboardSkeleton() {
  return (
    <div dir="rtl" className="mx-auto w-full max-w-screen-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-36 rounded-lg" />
      </header>
      <section aria-label={PAGE_TEXT.metrics} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <Skeleton className="h-5 w-44 rounded" />
        <Card>
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function DashboardError({
  error,
  loading,
  onRetry,
}: {
  error: string
  loading: boolean
  onRetry: () => void
}) {
  return (
    <div dir="rtl" className="mx-auto w-full max-w-screen-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">{PAGE_TEXT.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{PAGE_TEXT.description}</p>
      </header>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p role="alert" className="text-sm text-destructive">
            {error || PAGE_TEXT.unavailable}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            disabled={loading}
            aria-busy={loading}
            className="min-h-11"
          >
            {loading ? PAGE_TEXT.retrying : PAGE_TEXT.retry}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, description, attention = false }: DashboardMetric) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <p
          className={`text-3xl font-black tabular-nums ${attention ? 'text-destructive' : ''}`}
        >
          {numberFormatter.format(value)}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function UserDashboardPage() {
  const navigate = useNavigate()
  const userStats = useAppStore((state) => state.userStats)
  const setUserStats = useAppStore((state) => state.setUserStats)
  const openDrawer = useAppStore((state) => state.openDrawer)
  const [loading, setLoading] = useState(!userStats)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const loadDashboard = useCallback(async () => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError(null)
    try {
      const stats = await api.dashboard.userStats()
      if (sequence === requestSequence.current) setUserStats(stats)
    } catch (loadError) {
      if (sequence === requestSequence.current) {
        setError(
          loadError instanceof Error ? loadError.message : PAGE_TEXT.loadError
        )
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [setUserStats])

  useEffect(() => {
    void loadDashboard()
    return () => {
      requestSequence.current += 1
    }
  }, [loadDashboard])

  if (loading && !userStats) return <DashboardSkeleton />
  if (!userStats) {
    return (
      <DashboardError
        error={error ?? PAGE_TEXT.unavailable}
        loading={loading}
        onRetry={() => void loadDashboard()}
      />
    )
  }

  const metrics: DashboardMetric[] = [
    {
      title: PAGE_TEXT.active,
      value: userStats.myActiveRequisitions,
      description: PAGE_TEXT.activeDescription,
    },
    {
      title: PAGE_TEXT.drafts,
      value: userStats.myDrafts,
      description: PAGE_TEXT.draftsDescription,
    },
    {
      title: PAGE_TEXT.review,
      value: userStats.awaitingReview,
      description: PAGE_TEXT.reviewDescription,
    },
    {
      title: PAGE_TEXT.signOff,
      value: userStats.awaitingSignOff,
      description: PAGE_TEXT.signOffDescription,
    },
    {
      title: PAGE_TEXT.revision,
      value: userStats.reviseCount,
      description: PAGE_TEXT.revisionDescription,
      attention: userStats.reviseCount > 0,
    },
    {
      title: PAGE_TEXT.overdue,
      value: userStats.overdueCount,
      description: PAGE_TEXT.overdueDescription,
      attention: userStats.overdueCount > 0,
    },
  ]
  const hasAnyRequests =
    userStats.myActiveRequisitions > 0 ||
    userStats.myDrafts > 0 ||
    userStats.awaitingReview > 0 ||
    userStats.awaitingSignOff > 0 ||
    userStats.reviseCount > 0 ||
    userStats.overdueCount > 0 ||
    userStats.wonCount > 0 ||
    userStats.lostCount > 0

  return (
    <div dir="rtl" className="mx-auto w-full max-w-screen-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{PAGE_TEXT.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{PAGE_TEXT.description}</p>
        </div>
        <Button
          type="button"
          onClick={() => navigate('/requisitions/new')}
          className="min-h-11 w-full sm:w-auto"
        >
          {PAGE_TEXT.createRequest}
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadDashboard()}
              disabled={loading}
              aria-busy={loading}
              className="min-h-11"
            >
              {loading ? PAGE_TEXT.retrying : PAGE_TEXT.retry}
            </Button>
          </CardContent>
        </Card>
      )}

      <section
        aria-label={PAGE_TEXT.metrics}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      {!hasAnyRequests && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-10">
            <h2 className="text-lg font-bold">{PAGE_TEXT.emptyTitle}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{PAGE_TEXT.emptyDescription}</p>
            <Button
              type="button"
              onClick={() => navigate('/requisitions/new')}
              className="min-h-11"
            >
              {PAGE_TEXT.createRequest}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section aria-labelledby="action-required-heading" className="space-y-3 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle id="action-required-heading" className="text-base font-bold">
                {PAGE_TEXT.actionRequired}
              </CardTitle>
              <CardDescription>{PAGE_TEXT.actionRequiredDescription}</CardDescription>
            </CardHeader>
            <CardContent className="border-t pt-2">
              {userStats.actionRequired.length > 0 ? (
                <ul className="divide-y divide-border">
                  {userStats.actionRequired.map((requisition) => {
                    const urgency = getUrgencyMeta(requisition.daysLeft)
                    const isOverdue = requisition.daysLeft < 0
                    return (
                      <li key={requisition.id}>
                        <button
                          type="button"
                          onClick={() => void openDrawer(requisition.id)}
                          aria-label={PAGE_TEXT.openRequest(requisition.identifier, requisition.title)}
                          className="flex min-h-16 w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-3 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        >
                          <span
                            dir="ltr"
                            className="w-28 shrink-0 font-mono text-sm font-semibold text-primary"
                          >
                            {requisition.identifier}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {requisition.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {requisition.clientName} · {requisition.plantName}
                            </span>
                          </span>
                          <span className="shrink-0">
                            <StatusBadge status={requisition.status} />
                          </span>
                          <span className="ms-auto min-w-24 shrink-0 text-end">
                            <span
                              className={`block text-sm font-semibold tabular-nums ${
                                isOverdue ? 'text-destructive' : ''
                              }`}
                            >
                              {formatDateShort(requisition.dueDate)}
                            </span>
                            <span
                              className={`mt-0.5 block text-xs ${
                                isOverdue
                                  ? 'font-semibold text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {urgency.label}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {PAGE_TEXT.noActionRequired}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="outcomes-heading" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle id="outcomes-heading" className="text-base font-bold">
                {PAGE_TEXT.outcomes}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 border-t pt-5">
              <OutcomeMetric title={PAGE_TEXT.won} value={userStats.wonCount} />
              <OutcomeMetric title={PAGE_TEXT.lost} value={userStats.lostCount} />
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">{PAGE_TEXT.winRate}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {new Intl.NumberFormat('ar', { maximumFractionDigits: 1 }).format(
                    userStats.winRate
                  )}
                  <span className="ms-1 text-sm font-medium text-muted-foreground">٪</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function OutcomeMetric({ title, value }: { title: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-lg font-bold tabular-nums">{numberFormatter.format(value)}</p>
    </div>
  )
}
