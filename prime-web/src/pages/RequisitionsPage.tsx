import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { StatusBadge } from '@/components/StatusBadge'
import { getUrgencyMeta, STATUS_OPTIONS } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { RequisitionDto } from '@/lib/types'

type SortKey = 'identifier' | 'externalRef' | 'plantName' | 'sectorName' | 'title' | 'dueDate' | 'status'
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'identifier', label: 'المعرف' },
  { key: 'externalRef', label: 'المرجع الخارجي' },
  { key: 'plantName', label: 'المصنع' },
  { key: 'sectorName', label: 'القسم' },
  { key: 'title', label: 'عنوان الطلب' },
  { key: 'dueDate', label: 'تاريخ الاستحقاق' },
  { key: 'status', label: 'الحالة' },
]

const PAGE_SIZE = 10
const OPEN_STATUSES = new Set([
  'NEW',
  'REVIEW',
  'PROCESSING',
  'MANAGER_REVIEW',
  'READY_FOR_APPROVAL',
  'INTERNAL_APPROVAL',
  'APPROVED',
  'SUBMITTED',
  'REVISE',
])
const numberFormatter = new Intl.NumberFormat('ar')

export function RequisitionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const requisitions = useAppStore((s) => s.requisitions)
  const loading = useAppStore((s) => s.loading)
  const error = useAppStore((s) => s.error)
  const fetchRequisitions = useAppStore((s) => s.fetchRequisitions)
  const plants = useAppStore((s) => s.plants)
  const sectors = useAppStore((s) => s.sectors)
  const filters = useAppStore((s) => s.filters)
  const setFilter = useAppStore((s) => s.setFilter)
  const resetFilters = useAppStore((s) => s.resetFilters)
  const openDrawer = useAppStore((s) => s.openDrawer)
  const deleteRequisition = useAppStore((s) => s.deleteRequisition)
  const kpiStats = useAppStore((s) => s.kpiStats)
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'
  const canEdit = isAdmin || role === 'Manager'

  const [sort, setSort] = useState<{ key: SortKey; direction: SortDir } | null>(null)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<RequisitionDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { toast } = useToast()

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRequisition(deleteTarget.id)
      setDeleteTarget(null)
      successToast('تم حذف الطلب بنجاح')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const createdIdentifier = (location.state as { createdIdentifier?: string } | null)?.createdIdentifier

  useEffect(() => {
    if (!createdIdentifier) return
    successToast(`تم إنشاء الطلب ${createdIdentifier} بنجاح`)
    navigate(location.pathname, { replace: true, state: null })
  }, [createdIdentifier, location.pathname, navigate])

  const sorted = useMemo(() => {
    if (!sort) return requisitions
    return [...requisitions].sort((a, b) => {
      const comparison = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'ar', {
        numeric: true,
      })
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [requisitions, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const statusList = useMemo(
    () => (filters.status ? filters.status.split(',').filter(Boolean) : []),
    [filters.status]
  )
  const statusLabel =
    statusList.length === 0
      ? 'الكل'
      : statusList.length === 1
        ? STATUS_OPTIONS.find((status) => status.value === statusList[0])?.label ?? 'مخصص'
        : 'مخصص'
  const hasActiveFilters =
    filters.search !== '' ||
    filters.plantId !== null ||
    filters.sectorCode !== null ||
    filters.status !== null

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages))
  }, [totalPages])

  const toggleStatus = (value: string) => {
    const next = statusList.includes(value)
      ? statusList.filter((status) => status !== value)
      : [...statusList, value]
    setFilter({ status: next.length ? next.join(',') : null })
  }

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const stats = [
    { title: 'إجمالي الطلبات', value: kpiStats?.totalCount, subtitle: 'ضمن النتائج الحالية' },
    { title: 'الطلبات المفتوحة', value: kpiStats?.openCount, subtitle: 'قيد المراجعة أو المعالجة' },
    { title: 'الطلبات المتأخرة', value: kpiStats?.overdueCount, subtitle: 'مرّ تاريخ استحقاقها' },
  ]

  return (
    <div dir="rtl" className="mx-auto w-full max-w-screen-2xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">طلبات الشراء</h1>
          <p className="text-sm text-muted-foreground">متابعة طلبات الشراء وتحديث حالاتها</p>
        </div>
        <Button
          onClick={() => navigate('/requisitions/new')}
          className="min-h-11 w-full sm:w-auto"
        >
          طلب شراء جديد
        </Button>
      </header>

      <section aria-label="ملخص الطلبات" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-medium text-muted-foreground">{stat.title}</h2>
              {loading && stat.value == null ? (
                <Skeleton className="h-9 w-24" />
              ) : stat.value == null ? (
                <p className="text-3xl font-bold tabular-nums" aria-label="غير متاح">—</p>
              ) : (
                <p className="text-3xl font-bold tabular-nums">
                  {numberFormatter.format(stat.value)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
            <Label htmlFor="requisition-search">البحث</Label>
            <Input
              id="requisition-search"
              placeholder="المعرف أو المرجع الخارجي"
              value={filters.search}
              onChange={(event) => setFilter({ search: event.target.value })}
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requisition-plant">المصنع</Label>
            <Select
              value={filters.plantId == null ? 'all' : String(filters.plantId)}
              onValueChange={(value) =>
                setFilter({ plantId: value === 'all' ? null : Number(value) })
              }
            >
              <SelectTrigger id="requisition-plant" className="min-h-11">
                <SelectValue placeholder="كل المصانع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المصانع</SelectItem>
                {plants.map((plant) => (
                  <SelectItem key={plant.id} value={String(plant.id)}>
                    {plant.plantName} [{plant.shortCode}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requisition-sector">القسم</Label>
            <Select
              value={filters.sectorCode ?? 'all'}
              onValueChange={(value) => setFilter({ sectorCode: value === 'all' ? null : value })}
            >
              <SelectTrigger id="requisition-sector" className="min-h-11">
                <SelectValue placeholder="كل الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.code} value={sector.code}>
                    {sector.code} - {sector.nameArabic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label id="requisition-status-label">الحالة</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-labelledby="requisition-status-label"
                  className="min-h-11 w-full justify-between font-normal"
                >
                  <span>{statusLabel}</span>
                  <span aria-hidden="true" className="text-muted-foreground">▾</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusList.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setFilter({ status: null })}>
                  إظهار كل الحالات
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasActiveFilters && (
            <div className="sm:col-span-2 xl:col-span-4">
              <Button type="button" variant="ghost" onClick={resetFilters} className="min-h-11 px-2">
                مسح عوامل التصفية
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" onClick={() => void fetchRequisitions()} className="min-h-11">
            إعادة المحاولة
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-1 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">قائمة الطلبات</h2>
            <p className="text-sm text-muted-foreground">
              {numberFormatter.format(requisitions.length)} طلب
              {hasActiveFilters ? ' مطابق لعوامل التصفية' : ''}
            </p>
          </div>
        </div>

        {loading && requisitions.length === 0 ? (
          <div className="space-y-3 p-5" aria-label="جارٍ تحميل الطلبات" aria-busy="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : error && requisitions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            تعذر عرض الطلبات حتى اكتمال التحميل.
          </p>
        ) : requisitions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <h3 className="font-semibold">
              {hasActiveFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد طلبات شراء بعد'}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'جرّب تعديل عوامل التصفية أو مسحها لعرض الطلبات المتاحة.'
                : 'أنشئ أول طلب شراء لبدء متابعة عروض الأسعار وحالاتها.'}
            </p>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" onClick={resetFilters} className="min-h-11">
                مسح عوامل التصفية
              </Button>
            ) : (
              <Button onClick={() => navigate('/requisitions/new')} className="min-h-11">
                طلب شراء جديد
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[1050px]">
                <caption className="sr-only">
                  قائمة طلبات الشراء — {sorted.length} طلب، صفحة {page} من {totalPages}
                </caption>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((column) => (
                      <TableHead
                        key={column.key}
                        aria-sort={
                          sort?.key === column.key
                            ? sort.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="inline-flex min-h-11 items-center gap-2 text-start font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {column.label}
                          <span aria-hidden="true">
                            {sort?.key === column.key
                              ? sort.direction === 'asc'
                                ? '↑'
                                : '↓'
                              : '↕'}
                          </span>
                        </button>
                      </TableHead>
                    ))}
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const isOpen = OPEN_STATUSES.has(row.status)
                    const daysLeft = Math.ceil((new Date(row.dueDate).getTime() - Date.now()) / 86_400_000)
                    const overdue = isOpen && daysLeft < 0
                    const showUrgency = isOpen && daysLeft <= 7

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openDrawer(row.id)}
                            className="min-h-11 font-mono font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span dir="ltr">{row.identifier}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <span dir="ltr" className="font-mono text-sm">{row.externalRef}</span>
                        </TableCell>
                        <TableCell>
                          <span>{row.plantName}</span>{' '}
                          <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                            {row.plantShortCode}
                          </span>
                        </TableCell>
                        <TableCell>{row.sectorName}</TableCell>
                        <TableCell className="max-w-[260px] truncate font-medium">{row.title}</TableCell>
                        <TableCell>
                          <span
                            dir="ltr"
                            className={`tabular-nums ${overdue ? 'font-semibold text-destructive' : ''}`}
                          >
                            {row.dueDate.slice(0, 10)}
                          </span>
                          {showUrgency && (
                            <p
                              className={`text-xs ${
                                overdue || daysLeft <= 1
                                  ? 'text-destructive'
                                  : daysLeft <= 3
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {getUrgencyMeta(daysLeft).label}
                            </p>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" className="min-h-10">
                                إجراءات
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onSelect={() => navigate(`/requisitions/${row.id}`)}>
                                عرض التفاصيل
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onSelect={() => navigate(`/requisitions/${row.id}/edit`)}>
                                  تعديل
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setDeleteTarget(row)
                                      setDeleteError(null)
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    حذف
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                عرض {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, sorted.length)} من {numberFormatter.format(sorted.length)}
              </p>
              <nav aria-label="التنقل بين صفحات الطلبات" className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                  className="min-h-11"
                >
                  السابق
                </Button>
                <span aria-live="polite" className="min-w-24 text-center text-sm text-muted-foreground">
                  صفحة {page} من {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  className="min-h-11"
                >
                  التالي
                </Button>
              </nav>
            </div>
          </>
        )}
      </Card>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الطلب{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.identifier}</span>؟
              سيتم حذف جميع سجلاته نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'جارٍ الحذف...' : 'حذف الطلب'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
