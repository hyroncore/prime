import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
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
  const navigate = useNavigate()
  const plants = useAppStore((s) => s.plants)
  const clients = useAppStore((s) => s.clients)
  const loading = useAppStore((s) => s.loading)
  const openPlantDialog = useAppStore((s) => s.openPlantDialog)
  const deletePlant = useAppStore((s) => s.deletePlant)
  const fetchClients = useAppStore((s) => s.fetchClients)
  const fetchPlants = useAppStore((s) => s.fetchPlants)
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'
  const isManager = role === 'Manager'
  const canManageClients = isAdmin || isManager

  useEffect(() => {
    if (clients.length === 0) void fetchClients()
    if (plants.length === 0) void fetchPlants()
  }, [clients.length, plants.length, fetchClients, fetchPlants])

  const [searchParams, setSearchParams] = useSearchParams()
  const clientParam = searchParams.get('client')
  const clientFilter = useMemo(() => {
    if (!clientParam) return null
    return clients.find((c) => c.id === Number(clientParam)) ?? null
  }, [clients, clientParam])

  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const clientPlants = clientFilter ? plants.filter((p) => p.clientId === clientFilter.id) : plants
    const term = searchTerm.trim()
    if (!term) return clientPlants
    return clientPlants.filter(
      (p) =>
        p.plantName.includes(term) ||
        p.shortCode.toLowerCase().includes(term.toLowerCase()) ||
        p.clientName.includes(term)
    )
  }, [plants, clientFilter, searchTerm])

  const kpis = useMemo(() => {
    const scope = clientFilter ? plants.filter((p) => p.clientId === clientFilter.id) : plants
    const total = scope.length
    const active = scope.filter((p) => p.openRequisitions > 0).length
    const openTotal = scope.reduce((sum, p) => sum + p.openRequisitions, 0)

    return [
      {
        title: 'إجمالي العملاء',
        value: String(total),
        subtitle: clientFilter ? 'ضمن هذه الجهة' : 'عميل مسجل في النظام',
      },
      { title: 'العملاء النشطون', value: String(active), subtitle: 'لديهم طلبات مفتوحة حالياً' },
      {
        title: 'الطلبات المفتوحة',
        value: String(openTotal),
        subtitle: 'مجموع طلبات قيد المراجعة أو المعالجة',
      },
    ]
  }, [plants, clientFilter])

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="mb-3 h-3 w-24 rounded" />
              <Skeleton className="mb-1 h-8 w-32 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </Card>
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
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">العملاء</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            المصانع المتعامل معها والجهة المرتبطة بها لكل عميل
          </p>
        </div>
        {canManageClients && (
          <Button
            onClick={() => navigate('/clients/new')}
            className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            إضافة عميل جديد
          </Button>
        )}
      </header>

      <section aria-label="ملخص العملاء" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((stat) => (
          <Card key={stat.title} className="p-5">
            <p className="text-xs font-bold tracking-wide text-muted-foreground">
              {stat.title}
            </p>
            <p className="mt-2 text-2xl font-black tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.subtitle}</p>
          </Card>
        ))}
      </section>

      {clientFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-xs font-bold">
            عرض عملاء الجهة: <span className="text-primary">{clientFilter.name}</span>
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="min-h-11 rounded-md px-2 text-xs font-semibold text-red-700 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-red-400 dark:hover:text-red-300"
          >
            إزالة التصفية
          </button>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="client-search" className="text-sm font-bold">
          البحث في العملاء
        </label>
        <Input
          id="client-search"
          placeholder="بحث بالاسم أو الرمز أو الجهة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 w-full max-w-md text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-base font-black text-foreground">
            {clientFilter || searchTerm.trim() ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {clientFilter || searchTerm.trim()
              ? 'جرّب تعديل البحث أو إزالة تصفية الجهة'
              : 'أضف أول عميل لبدء تسجيل طلبات الشراء الخاصة به'}
          </p>
          {(!clientFilter && !searchTerm.trim() && canManageClients) && (
            <Button
              onClick={() => navigate('/clients/new')}
              className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              إضافة عميل جديد
            </Button>
          )}
          {(clientFilter || searchTerm.trim()) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSearchParams({})
              }}
              className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-bold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              مسح التصفية
            </button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table className="min-w-[760px]">
            <caption className="sr-only">قائمة العملاء والجهات وعدد طلبات الشراء المرتبطة</caption>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead scope="col" className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                  العميل
                </TableHead>
                <TableHead scope="col" className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                  الجهة / الشركة
                </TableHead>
                <TableHead scope="col" className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                  الطلبات المفتوحة
                </TableHead>
                <TableHead scope="col" className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                  إجمالي الطلبات
                </TableHead>
                <TableHead scope="col" className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                  إجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((plant) => (
                <TableRow key={plant.id}>
                  <TableCell className="px-5 py-3.5">
                    <span className="text-sm font-bold">{plant.plantName}</span>
                    <span className="ms-2 font-mono text-[11px] font-bold text-muted-foreground" dir="ltr">
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
                    <div className="flex items-center justify-center gap-3">
                      {canManageClients && (
                        <button
                          onClick={() => openPlantDialog(plant)}
                          className="min-h-11 px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          تعديل
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setDeleteTarget(plant.id)
                            setDeleteError(null)
                          }}
                          className="min-h-11 px-2 text-xs font-semibold text-red-700 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-red-400 dark:hover:text-red-300"
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
        </Card>
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