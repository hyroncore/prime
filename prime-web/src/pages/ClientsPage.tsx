import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'

export function ClientsPage() {
  const plants = useAppStore((s) => s.plants)
  const clients = useAppStore((s) => s.clients)
  const loading = useAppStore((s) => s.loading)
  const openPlantDialog = useAppStore((s) => s.openPlantDialog)
  const deletePlant = useAppStore((s) => s.deletePlant)
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')

  const [searchParams, setSearchParams] = useSearchParams()
  const companyParam = searchParams.get('company')
  const companyFilter = useMemo(() => {
    if (!companyParam) return null
    return clients.find((c) => c.id === Number(companyParam)) ?? null
  }, [clients, companyParam])

  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const companyBased = companyFilter ? plants.filter((p) => p.clientId === companyFilter.id) : plants
    const term = searchTerm.trim()
    if (!term) return companyBased
    return companyBased.filter(
      (p) =>
        p.plantName.includes(term) ||
        p.shortCode.toLowerCase().includes(term.toLowerCase()) ||
        p.clientName.includes(term)
    )
  }, [plants, companyFilter, searchTerm])

  const kpis = useMemo(() => {
    const scope = companyFilter ? plants.filter((p) => p.clientId === companyFilter.id) : plants
    const total = scope.length
    const active = scope.filter((p) => p.openRequisitions > 0).length
    const openTotal = scope.reduce((sum, p) => sum + p.openRequisitions, 0)
    const decided = scope.reduce((sum, p) => sum + p.wonCount + p.lostCount, 0)
    const won = scope.reduce((sum, p) => sum + p.wonCount, 0)
    const avgWinRate = decided === 0 ? 0 : Math.round((won / decided) * 1000) / 10

    return [
      {
        title: 'إجمالي العملاء',
        value: String(total),
        subtitle: companyFilter ? 'ضمن هذه الجهة' : 'عميل مسجل في النظام',
      },
      { title: 'العملاء النشطون', value: String(active), subtitle: 'لديهم طلبات مفتوحة حالياً' },
      {
        title: 'الطلبات المفتوحة',
        value: String(openTotal),
        subtitle: 'مجموع طلبات قيد المراجعة أو المعالجة',
      },
      { title: 'متوسط نسبة الفوز', value: `${avgWinRate}%`, subtitle: 'عبر جميع العملاء' },
    ]
  }, [plants, companyFilter])

  const handleDelete = async () => {
    if (deleteTarget == null) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePlant(deleteTarget)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const deleteName = plants.find((p) => p.id === deleteTarget)?.plantName ?? ''

  if (loading && plants.length === 0) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
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
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-t border-border first:border-t-0">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">العملاء</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            المصانع المتعامل معها والجهة المرتبطة بها لكل عميل
          </p>
        </div>
        <Button
          onClick={() => openPlantDialog()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
        >
          + إضافة عميل جديد
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
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight truncate">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {companyFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-xs font-bold">
            عرض عملاء الجهة: <span className="text-primary">{companyFilter.name}</span>
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs font-semibold text-red-700 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            إزالة التصفية
          </button>
        </div>
      )}

      <Input
        placeholder="بحث بالاسم أو الرمز أو الجهة..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9 text-sm max-w-md"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-base font-black text-foreground">
            {companyFilter || searchTerm.trim() ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {companyFilter || searchTerm.trim()
              ? 'جرّب تعديل البحث أو إزالة تصفية الجهة'
              : 'أضف أول عميل لبدء تسجيل طلبات الشراء الخاصة به'}
          </p>
          {companyFilter || searchTerm.trim() ? (
            <button
              onClick={() => {
                setSearchTerm('')
                setSearchParams({})
              }}
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold transition-colors hover:bg-muted"
            >
              مسح التصفية
            </button>
          ) : (
            <Button
              onClick={() => openPlantDialog()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              + إضافة عميل جديد
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                العميل
              </TableHead>
              <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                الجهة / الشركة
              </TableHead>
              <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                الطلبات المفتوحة
              </TableHead>
              <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                إجمالي الطلبات
              </TableHead>
              <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                فائزة / خاسرة
              </TableHead>
              <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                نسبة الفوز
              </TableHead>
              <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                إجراءات
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((plant) => (
              <TableRow
                key={plant.id}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <TableCell className="px-5 py-3.5">
                  <span className="text-sm font-bold">{plant.plantName}</span>
                  <span className="mr-2 font-mono text-[11px] font-bold text-muted-foreground" dir="ltr">
                    {plant.shortCode}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3.5">
                  <span className="text-sm font-semibold">{plant.clientName}</span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-center">
                  <span className="text-sm font-black tabular-nums text-primary">
                    {plant.openRequisitions}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-center">
                  <span className="text-sm font-bold tabular-nums">{plant.totalRequisitions}</span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-center">
                  <span className="text-sm font-bold tabular-nums text-green-700 dark:text-green-400">
                    {plant.wonCount}
                  </span>
                  <span className="text-sm text-muted-foreground mx-1">/</span>
                  <span className="text-sm font-bold tabular-nums text-red-700 dark:text-red-400">
                    {plant.lostCount}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-center">
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {plant.winRate}%
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => openPlantDialog(plant)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      تعديل
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setDeleteTarget(plant.id)
                          setDeleteError(null)
                        }}
                        className="text-xs font-semibold text-red-700 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف العميل{' '}
              <span className="font-bold text-foreground">{deleteName}</span>؟ لا يمكن الحذف إذا
              كان للعميل طلبات شراء مسجلة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full text-xs font-bold"
              disabled={deleting}
              onClick={handleDelete}
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