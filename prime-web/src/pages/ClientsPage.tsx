import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'

export function ClientsPage() {
  const navigate = useNavigate()
  const plants = useAppStore((state) => state.plants)
  const clients = useAppStore((state) => state.clients)
  const loading = useAppStore((state) => state.loading)
  const openPlantDialog = useAppStore((state) => state.openPlantDialog)
  const openClientDialog = useAppStore((state) => state.openClientDialog)
  const openClientEditDialog = useAppStore((state) => state.openClientEditDialog)
  const deleteClient = useAppStore((state) => state.deleteClient)
  const deletePlant = useAppStore((state) => state.deletePlant)
  const fetchClients = useAppStore((state) => state.fetchClients)
  const fetchPlants = useAppStore((state) => state.fetchPlants)
  const role = useAuthStore((state) => state.user?.role)
  const isAdmin = role === 'Admin'
  const canManagePlants = isAdmin || role === 'Manager'
  const { toast } = useToast()

  useEffect(() => {
    if (clients.length === 0) void fetchClients()
    if (plants.length === 0) void fetchPlants()
  }, [clients.length, plants.length, fetchClients, fetchPlants])

  const [searchParams, setSearchParams] = useSearchParams()
  const clientParam = searchParams.get('client')
  const clientFilter = useMemo(() => {
    if (!clientParam) return null
    return clients.find((client) => client.id === Number(clientParam)) ?? null
  }, [clients, clientParam])

  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [companyDeleteTarget, setCompanyDeleteTarget] = useState<number | null>(null)
  const [deletingCompany, setDeletingCompany] = useState(false)
  const [companyDeleteError, setCompanyDeleteError] = useState<string | null>(null)

  const search = searchTerm.trim().toLocaleLowerCase()
  const filteredPlants = useMemo(() => {
    const scopedPlants = clientFilter
      ? plants.filter((plant) => plant.clientId === clientFilter.id)
      : plants

    return scopedPlants
      .filter((plant) => {
        if (!search) return true
        return [plant.clientName, plant.plantName, plant.shortCode].some((value) =>
          value.toLocaleLowerCase().includes(search),
        )
      })
      .sort(
        (a, b) =>
          a.clientName.localeCompare(b.clientName, 'ar') ||
          a.plantName.localeCompare(b.plantName, 'ar') ||
          a.shortCode.localeCompare(b.shortCode, 'ar'),
      )
  }, [plants, clientFilter, search])

  const filteredCompanies = useMemo(
    () =>
      [...clients]
        .filter((client) => {
          if (!search) return true
          return [client.name, client.code, client.primaryContactName ?? ''].some((value) =>
            value.toLocaleLowerCase().includes(search),
          )
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [clients, search],
  )

  const summaryPlants = clientFilter
    ? plants.filter((plant) => plant.clientId === clientFilter.id)
    : plants
  const openRequisitions = summaryPlants.reduce(
    (total, plant) => total + plant.openRequisitions,
    0,
  )
  const activePlants = summaryPlants.filter((plant) => plant.openRequisitions > 0).length
  const metrics = [
    { label: 'الشركات', value: clients.length },
    { label: 'المصانع', value: summaryPlants.length },
    { label: 'الطلبات المفتوحة', value: openRequisitions },
  ]

  const handleDeletePlant = async () => {
    if (deleteTarget == null) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePlant(deleteTarget)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'تعذر حذف المصنع.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCompany = async () => {
    if (companyDeleteTarget == null) return
    setDeletingCompany(true)
    setCompanyDeleteError(null)
    try {
      await deleteClient(companyDeleteTarget)
      setCompanyDeleteTarget(null)
      toast({ title: 'تم حذف الشركة بنجاح' })
    } catch (error) {
      setCompanyDeleteError(error instanceof Error ? error.message : 'تعذر حذف الشركة.')
    } finally {
      setDeletingCompany(false)
    }
  }

  const selectedPlant = plants.find((plant) => plant.id === deleteTarget)
  const selectedCompany = clients.find((client) => client.id === companyDeleteTarget)
  const clearCompanyFilter = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('client')
    setSearchParams(nextParams)
  }

  if (loading && plants.length === 0 && clients.length === 0) {
    return (
      <div dir="rtl" className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-36 rounded-lg" />
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="space-y-3 p-5">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </Card>
          ))}
        </div>
        <Card className="space-y-4 p-5">
          <Skeleton className="h-5 w-32 rounded" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded" />
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">الشركات والمصانع</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            إدارة الشركات والمصانع التابعة لها وبيانات الطلبات
          </p>
        </div>
        {canManagePlants && (
          <Button
            onClick={() => navigate('/clients/new')}
            className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            إضافة مصنع
          </Button>
        )}
      </header>

      <section aria-label="ملخص الشركات والمصانع" className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <p className="text-xs font-bold text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums tracking-tight">{metric.value}</p>
          </Card>
        ))}
      </section>

      <section aria-label="البحث والتصفية" className="space-y-3">
        <label htmlFor="clients-search" className="text-sm font-bold">
          البحث في الشركات والمصانع
        </label>
        <Input
          id="clients-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="ابحث باسم الشركة أو المصنع أو الكود..."
          className="h-11 w-full text-sm sm:max-w-md"
        />
        {clientFilter && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-s-2 border-primary ps-3">
            <p className="text-sm">
              المصانع ضمن شركة <span className="font-bold">{clientFilter.name}</span>
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={clearCompanyFilter}
              className="min-h-10 px-2 text-xs font-semibold text-muted-foreground"
            >
              إزالة التصفية
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="companies-heading" className="space-y-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="companies-heading" className="text-sm font-black">
            الشركات
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              {filteredCompanies.length} شركة
            </span>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={openClientDialog}
                className="min-h-10 text-xs font-semibold"
              >
                إضافة شركة
              </Button>
            )}
          </div>
        </header>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    الشركة
                  </TableHead>
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    الكود
                  </TableHead>
                  <TableHead className="h-10 px-4 text-center text-[11px] font-bold tracking-wider text-muted-foreground">
                    المصانع
                  </TableHead>
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    مسؤول التواصل
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="h-10 px-4 text-center text-[11px] font-bold tracking-wider text-muted-foreground">
                      إجراءات
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 5 : 4}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {search
                        ? 'لا توجد شركات تطابق البحث.'
                        : 'لا توجد شركات مسجلة بعد.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="px-4 py-3.5 text-sm font-semibold">
                        {company.name}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-xs" dir="ltr">
                        {company.code}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-sm tabular-nums">
                        {company.plants.length}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                        {company.primaryContactName || '—'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="px-4 py-2 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => openClientEditDialog(company)}
                              className="min-h-10 px-3 text-xs font-semibold"
                            >
                              تعديل
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setCompanyDeleteTarget(company.id)
                                setCompanyDeleteError(null)
                              }}
                              className="min-h-10 px-3 text-xs font-semibold text-destructive hover:text-destructive"
                            >
                              حذف
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="plants-heading" className="space-y-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plants-heading" className="text-sm font-black">
            المصانع
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filteredPlants.length} مصنع
          </span>
        </header>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <caption className="sr-only">المصانع مرتبة حسب الشركة واسم المصنع والكود</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    الشركة
                  </TableHead>
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    المصنع
                  </TableHead>
                  <TableHead className="h-10 px-4 text-[11px] font-bold tracking-wider text-muted-foreground">
                    الكود
                  </TableHead>
                  <TableHead className="h-10 px-4 text-center text-[11px] font-bold tracking-wider text-muted-foreground">
                    طلبات مفتوحة
                  </TableHead>
                  <TableHead className="h-10 px-4 text-center text-[11px] font-bold tracking-wider text-muted-foreground">
                    إجمالي الطلبات
                  </TableHead>
                  {(canManagePlants || isAdmin) && (
                    <TableHead className="h-10 px-4 text-center text-[11px] font-bold tracking-wider text-muted-foreground">
                      إجراءات
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManagePlants || isAdmin ? 6 : 5}
                      className="px-4 py-12 text-center"
                    >
                      <p className="text-sm font-semibold">
                        {search || clientFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد مصانع مسجلة'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {search || clientFilter
                          ? 'عدّل عبارة البحث أو أزل تصفية الشركة.'
                          : 'أضف مصنعاً لبدء تسجيل الطلبات.'}
                      </p>
                      {!search && !clientFilter && canManagePlants && (
                        <Button
                          onClick={() => navigate('/clients/new')}
                          className="mt-4 h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          إضافة مصنع
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlants.map((plant) => (
                    <TableRow key={plant.id}>
                      <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                        {plant.clientName}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-sm font-semibold">
                        {plant.plantName}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-xs" dir="ltr">
                        {plant.shortCode}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-sm font-semibold tabular-nums">
                        {plant.openRequisitions}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center text-sm tabular-nums">
                        {plant.totalRequisitions}
                      </TableCell>
                      {(canManagePlants || isAdmin) && (
                        <TableCell className="px-4 py-2 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {canManagePlants && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => openPlantDialog(plant)}
                                className="min-h-10 px-3 text-xs font-semibold"
                              >
                                تعديل
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setDeleteTarget(plant.id)
                                  setDeleteError(null)
                                }}
                                className="min-h-10 px-3 text-xs font-semibold text-destructive hover:text-destructive"
                              >
                                حذف
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {summaryPlants.length > 0 && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {activePlants} مصنع لديه طلبات مفتوحة من أصل {summaryPlants.length}
            </p>
          )}
        </Card>
      </section>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">حذف المصنع</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              هل تريد حذف المصنع «{selectedPlant?.plantName ?? ''}»؟ لا يمكن حذفه إذا كانت لديه
              طلبات شراء مسجلة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeletePlant()}
              className="min-h-11 w-full text-xs font-bold"
            >
              {deleting ? 'جارٍ الحذف...' : 'حذف المصنع'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="min-h-11 w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={companyDeleteTarget != null}
        onOpenChange={(open) => !open && setCompanyDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">حذف الشركة</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              هل تريد حذف الشركة «{selectedCompany?.name ?? ''}»؟ لا يمكن حذفها ما دامت مرتبطة
              بمصانع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {companyDeleteError && (
            <p role="alert" className="text-sm text-destructive">
              {companyDeleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              disabled={deletingCompany}
              onClick={() => void handleDeleteCompany()}
              className="min-h-11 w-full text-xs font-bold"
            >
              {deletingCompany ? 'جارٍ الحذف...' : 'حذف الشركة'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deletingCompany}
              onClick={() => setCompanyDeleteTarget(null)}
              className="min-h-11 w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
