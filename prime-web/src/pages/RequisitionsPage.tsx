import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { StatusBadge } from '@/components/StatusBadge'
import { getUrgencyMeta, STATUS_OPTIONS } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { RequisitionDto } from '@/lib/types'

type SortKey = 'identifier' | 'externalRef' | 'plantName' | 'sectorName' | 'title' | 'dueDate' | 'status'
type SortDir = 'asc' | 'desc' | null

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

const OPEN_STATUSES = 'NEW,REVIEW,PROCESSING'

export function RequisitionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const requisitions = useAppStore((s) => s.requisitions)
  const loading = useAppStore((s) => s.loading)
  const plants = useAppStore((s) => s.plants)
  const sectors = useAppStore((s) => s.sectors)
  const filters = useAppStore((s) => s.filters)
  const setFilter = useAppStore((s) => s.setFilter)
  const resetFilters = useAppStore((s) => s.resetFilters)
  const openDrawer = useAppStore((s) => s.openDrawer)
  const deleteRequisition = useAppStore((s) => s.deleteRequisition)
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')

  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
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
    const list = [...requisitions]
    if (sortKey && sortDir) {
      list.sort((a, b) => {
        const av = String(a[sortKey as keyof typeof a] ?? '')
        const bv = String(b[sortKey as keyof typeof b] ?? '')
        const cmp = av.localeCompare(bv, 'ar')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [requisitions, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kpiStats = useAppStore((s) => s.kpiStats)

  const statusList = useMemo(
    () => (filters.status ? filters.status.split(',').filter(Boolean) : []),
    [filters.status]
  )
  const statusLabel =
    statusList.length === 0
      ? 'الكل'
      : statusList.length === 1
        ? STATUS_OPTIONS.find((s) => s.value === statusList[0])?.label ?? 'مخصص'
        : 'مخصص'

  const toggleStatus = (value: string) => {
    const has = statusList.includes(value)
    const next = has ? statusList.filter((v) => v !== value) : [...statusList, value]
    setFilter({ status: next.length ? next.join(',') : null })
  }

  useEffect(() => {
    setPage(1)
  }, [filters])

  const handleSort = (key: SortKey) => {
    setSortKey(key)
    setSortDir((prev) => {
      if (prev === null) return 'asc'
      if (prev === 'asc') return 'desc'
      return null
    })
  }

  if (loading && requisitions.length === 0) {
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
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-t border-border first:border-t-0">
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasActiveFilters =
    filters.search !== '' || filters.plantId !== null || filters.sectorCode !== null || filters.status !== null

  const now = Date.now()

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">طلبات الشراء</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            متابعة طلبات الشراء وتحديث حالاتها
          </p>
        </div>
        <Button
          onClick={() => navigate('/requisitions/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
        >
          + طلب شراء جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8">
        {[
          {
            title: 'إجمالي الطلبات',
            value: String(kpiStats?.totalCount ?? 0),
            subtitle: 'ضمن النتائج الحالية',
          },
          {
            title: 'الطلبات المفتوحة',
            value: String(kpiStats?.openCount ?? 0),
            subtitle: 'قيد المراجعة أو المعالجة',
          },
          {
            title: 'الطلبات المتأخرة',
            value: String(kpiStats?.overdueCount ?? 0),
            subtitle: 'مرّ تاريخ استحقاقها',
          },
          {
            title: 'نسبة الفوز',
            value: `${Math.round(kpiStats?.winRate ?? 0)}%`,
            subtitle: `${kpiStats?.wonCount ?? 0} فائزة / ${kpiStats?.lostCount ?? 0} خاسرة`,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="lg:border-e lg:border-border lg:px-8 lg:first:ps-0 lg:last:border-e-0"
          >
            <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
              {stat.title}
            </p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">{stat.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="بحث بالمعرف (LB-03-01C8) أو المرجع الخارجي (SL75-2026)..."
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="h-9 text-sm max-w-md"
        />

        <Select
          value={filters.plantId == null ? 'all' : String(filters.plantId)}
          onValueChange={(value) => setFilter({ plantId: value === 'all' ? null : Number(value) })}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="المصنع: الكل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">المصنع: الكل</SelectItem>
            {plants.map((plant) => (
              <SelectItem key={plant.id} value={String(plant.id)}>
                {plant.plantName} [{plant.shortCode}]
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sectorCode ?? 'all'}
          onValueChange={(value) => setFilter({ sectorCode: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-56 text-sm">
            <SelectValue placeholder="القسم: الكل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">القسم: الكل</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector.code} value={sector.code}>
                {sector.code} - {sector.nameArabic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`h-9 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                filters.status
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              الحالة: {statusLabel}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={statusList.includes(opt.value)}
                onCheckedChange={() => toggleStatus(opt.value)}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setFilter({ status: null })}
              className="justify-between"
            >
              إظهار الكل
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            مسح التصفية
          </button>
        )}
      </div>

      {requisitions.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-base font-black text-foreground">
            {hasActiveFilters ? 'لا توجد نتائج مطابقة للتصفية' : 'لا توجد طلبات شراء بعد'}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {hasActiveFilters
              ? 'جرّب تعديل عوامل التصفية أو مسحها لعرض الطلبات المتاحة'
              : 'ابدأ بإنشاء أول طلب شراء لتتبع عروض الأسعار وحالاته'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold transition-colors hover:bg-muted"
            >
              مسح التصفية
            </button>
          ) : (
            <Button
              onClick={() => navigate('/requisitions/new')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              + طلب شراء جديد
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                {COLUMNS.map((col, index) => (
                  <TableHead key={`${col.key}-${index}`} className="px-5">
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center cursor-pointer text-[11px] font-bold text-muted-foreground tracking-wide hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key && sortDir && (
                        <span className="text-[10px] font-bold mr-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </TableHead>
                ))}
                <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const isOpen = OPEN_STATUSES.split(',').includes(row.status)
                  const daysLeft = Math.ceil(
                    (new Date(row.dueDate).getTime() - now) / 86_400_000
                  )
                  const showUrgency = isOpen && daysLeft <= 7
                  const overdue = isOpen && daysLeft < 0
                  return (
                    <TableRow
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => openDrawer(row.id)}
                    >
                      <TableCell className="px-5 py-3.5">
                        <span dir="ltr" className="font-mono text-sm font-bold text-primary">
                          {row.identifier}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <span dir="ltr" className="font-mono text-sm font-semibold">
                          {row.externalRef}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm">
                        {row.plantName}{' '}
                        <span dir="ltr" className="font-mono text-[10px] text-muted-foreground">
                          {row.plantShortCode}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
                        {row.sectorName}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm font-semibold max-w-[240px] truncate">
                        {row.title}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <p
                          dir="ltr"
                          className={`text-start text-sm font-semibold tabular-nums ${
                            overdue ? 'text-red-700 dark:text-red-400' : ''
                          }`}
                        >
                          {row.dueDate.slice(0, 10)}
                        </p>
                        {showUrgency && (
                          <p
                            className={`text-[10px] font-bold ${
                              overdue || daysLeft <= 1
                                ? 'text-red-700 dark:text-red-400'
                                : daysLeft <= 3
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {getUrgencyMeta(daysLeft).label}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell
                        className="px-5 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md px-2.5 py-1 text-sm font-black tracking-widest text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                              •••
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36">
                            <DropdownMenuItem onClick={() => navigate(`/requisitions/${row.id}`)}>
                              عرض
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/requisitions/${row.id}/edit`)}>
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTarget(row)
                                  setDeleteError(null)
                                }}
                                className="text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 focus:text-red-700 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40"
                              >
                                حذف
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
            <span className="text-xs text-muted-foreground">
              عرض {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, sorted.length)} من إجمالي {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default"
              >
                السابق
              </button>
              <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف الطلب{' '}
              <span className="font-bold text-foreground">{deleteTarget?.identifier}</span>؟ سيتم
              حذف جميع سجلاته نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
              className="w-full text-xs font-bold"
            >
              {deleting ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}