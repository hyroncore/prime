import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateShort, getUrgencyMeta } from '@/lib/format'
import type { RequisitionStatus } from '@/lib/types'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'

const MAX_VISIBLE_REQUESTS = 5
const numberFormatter = new Intl.NumberFormat('ar')

type RequestRowProps = {
  id: number
  identifier: string
  title: string
  clientName: string
  plantName: string
  status: RequisitionStatus
  date: string
  dateLabel: string
  urgent?: boolean
  onOpen: (id: number) => void
}

function RequestRow({
  id,
  identifier,
  title,
  clientName,
  plantName,
  status,
  date,
  dateLabel,
  urgent = false,
  onOpen,
}: RequestRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(id)}
        aria-label={`فتح الطلب ${identifier}: ${title}`}
        className="flex min-h-16 w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-4 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
      >
        <span dir="ltr" className="w-28 shrink-0 font-mono text-sm font-bold text-primary">
          {identifier}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {clientName} · {plantName}
          </span>
        </span>
        <span className="shrink-0">
          <StatusBadge status={status} />
        </span>
        <span className="ms-auto min-w-24 shrink-0 text-end">
          <span className={`block text-sm font-bold tabular-nums ${urgent ? 'text-destructive' : ''}`}>
            {date}
          </span>
          <span className={`mt-0.5 block text-xs ${urgent ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
            {dateLabel}
          </span>
        </span>
      </button>
    </li>
  )
}

function DashboardSkeleton() {
  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-36 rounded-lg" />
      </header>
      <section aria-label="ملخص طلبات الفريق" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-5 shadow-none">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </Card>
        ))}
      </section>
      {Array.from({ length: 2 }).map((_, index) => (
        <section key={index} className="space-y-3">
          <Skeleton className="h-5 w-44 rounded" />
          <Card className="space-y-3 p-4 shadow-none">
            {Array.from({ length: 3 }).map((__, row) => (
              <Skeleton key={row} className="h-14 w-full rounded-lg" />
            ))}
          </Card>
        </section>
      ))}
      <section className="space-y-3">
        <Skeleton className="h-5 w-32 rounded" />
        <Card className="space-y-3 p-5 shadow-none">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded" />
          ))}
        </Card>
      </section>
    </main>
  )
}

export function ManagerDashboardPage() {
  const navigate = useNavigate()
  const managerStats = useAppStore((state) => state.managerStats)
  const setManagerStats = useAppStore((state) => state.setManagerStats)
  const openDrawer = useAppStore((state) => state.openDrawer)
  const [loading, setLoading] = useState(!managerStats)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const loadDashboard = useCallback(async () => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError(null)
    try {
      const stats = await api.dashboard.managerStats()
      if (sequence === requestSequence.current) setManagerStats(stats)
    } catch (loadError) {
      if (sequence === requestSequence.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'تعذر تحميل بيانات لوحة التحكم.',
        )
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [setManagerStats])

  useEffect(() => {
    void loadDashboard()
    return () => {
      requestSequence.current += 1
    }
  }, [loadDashboard])

  if (loading && !managerStats) return <DashboardSkeleton />

  if (!managerStats) {
    return (
      <main dir="rtl" className="space-y-6">
        <header>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            متابعة أداء الفريق وطلبات المراجعة المعلقة
          </p>
        </header>
        <Card className="shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p role="alert" className="text-sm text-destructive">
              {error ?? 'لا تتوفر بيانات لوحة التحكم حالياً.'}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadDashboard()}
              disabled={loading}
              aria-busy={loading}
              className="h-11"
            >
              {loading ? 'جارٍ التحديث…' : 'إعادة المحاولة'}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const reviewRequests = managerStats.pendingReviews
  const signOffRequests = managerStats.pendingSignOffs
  const metrics = [
    {
      title: 'بانتظار المراجعة',
      value: managerStats.pendingReview,
      description: 'طلبات تحتاج إلى قرار',
    },
    {
      title: 'بانتظار الاعتماد النهائي',
      value: managerStats.pendingSignOff,
      description: 'طلبات تمت مراجعتها',
    },
    {
      title: 'إجمالي طلبات الفريق',
      value: managerStats.teamVolume,
      description: 'طلبات أعضاء فريقك',
    },
  ]

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المدير</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            متابعة أداء الفريق وطلبات المراجعة المعلقة
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate('/requisitions')}
          className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
        >
          عرض جميع الطلبات
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <p role="alert" className="text-sm text-destructive">
              تعذر تحديث البيانات: {error}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void loadDashboard()}
              disabled={loading}
              aria-busy={loading}
              className="h-11"
            >
              {loading ? 'جارٍ التحديث…' : 'إعادة المحاولة'}
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="ملخص طلبات الفريق" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} className="p-5 shadow-none">
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">
              {metric.title}
            </p>
            <p className="text-2xl font-black tabular-nums">
              {numberFormatter.format(metric.value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{metric.description}</p>
          </Card>
        ))}
      </section>

      <section aria-labelledby="pending-review-heading" className="space-y-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pending-review-heading" className="text-sm font-black">
            طلبات بانتظار المراجعة
            <span className="ms-2 text-xs font-semibold text-muted-foreground">
              ({numberFormatter.format(reviewRequests.length)})
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">مرتبة حسب تاريخ الاستحقاق</p>
        </header>
        <Card className="shadow-none">
          {reviewRequests.length > 0 ? (
            <>
              <ul className="divide-y divide-border p-2">
                {reviewRequests.slice(0, MAX_VISIBLE_REQUESTS).map((request) => {
                  const urgency = getUrgencyMeta(request.daysLeft)
                  return (
                    <RequestRow
                      key={request.id}
                      id={request.id}
                      identifier={request.identifier}
                      title={request.title}
                      clientName={request.clientName}
                      plantName={request.plantName}
                      status={request.status as RequisitionStatus}
                      date={formatDateShort(request.dueDate)}
                      dateLabel={urgency.label}
                      urgent={request.daysLeft < 0}
                      onOpen={openDrawer}
                    />
                  )
                })}
              </ul>
              {reviewRequests.length > MAX_VISIBLE_REQUESTS && (
                <div className="border-t border-border p-3">
                  <Button asChild variant="ghost" className="h-11 w-full">
                    <Link to="/requisitions">عرض جميع الطلبات</Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              لا توجد طلبات بانتظار المراجعة
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="pending-signoff-heading" className="space-y-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pending-signoff-heading" className="text-sm font-black">
            طلبات بانتظار الاعتماد النهائي
            <span className="ms-2 text-xs font-semibold text-muted-foreground">
              ({numberFormatter.format(signOffRequests.length)})
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">مرتبة حسب تاريخ التقديم</p>
        </header>
        <Card className="shadow-none">
          {signOffRequests.length > 0 ? (
            <>
              <ul className="divide-y divide-border p-2">
                {signOffRequests.slice(0, MAX_VISIBLE_REQUESTS).map((request) => (
                  <RequestRow
                    key={request.id}
                    id={request.id}
                    identifier={request.identifier}
                    title={request.title}
                    clientName={request.clientName}
                    plantName={request.plantName}
                    status="SUBMITTED"
                    date={formatDateShort(request.submittedAt)}
                    dateLabel="تاريخ التقديم"
                    onOpen={openDrawer}
                  />
                ))}
              </ul>
              {signOffRequests.length > MAX_VISIBLE_REQUESTS && (
                <div className="border-t border-border p-3">
                  <Button asChild variant="ghost" className="h-11 w-full">
                    <Link to="/requisitions">عرض جميع الطلبات</Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              لا توجد طلبات بانتظار الاعتماد النهائي
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="team-performance-heading" className="space-y-3">
        <h2 id="team-performance-heading" className="text-sm font-black">أداء أعضاء الفريق</h2>
        <Card className="overflow-hidden shadow-none">
          {managerStats.teamPerformance.length > 0 ? (
            <Table className="min-w-[560px]">
              <TableCaption className="sr-only">عدد الطلبات حسب حالة كل عضو في الفريق</TableCaption>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead scope="col" className="px-5">عضو الفريق</TableHead>
                  <TableHead scope="col" className="px-5">طلبات جارية</TableHead>
                  <TableHead scope="col" className="px-5">تحتاج إلى تعديل</TableHead>
                  <TableHead scope="col" className="px-5">مقدّمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {managerStats.teamPerformance.map((member) => (
                    <TableRow key={member.userId}>
                      <TableHead scope="row" className="px-5 py-3.5 text-start font-semibold">
                        {member.displayName}
                      </TableHead>
                      <TableCell className="px-5 py-3.5 tabular-nums">
                        {numberFormatter.format(member.openRequisitions)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 tabular-nums">
                        {numberFormatter.format(member.reviseCount)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 tabular-nums">
                        {numberFormatter.format(member.submittedCount)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <p className="py-5 text-center text-sm text-muted-foreground">
                لا يوجد أعضاء نشطون مرتبطون بفريقك حالياً.
              </p>
            </CardContent>
          )}
        </Card>
      </section>
    </main>
  )
}
