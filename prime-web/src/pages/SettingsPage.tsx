import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import { THEME_OPTIONS, useSettingsStore } from '@/store/useSettingsStore'
import { api } from '@/lib/api'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const navigate = useNavigate()
  const clients = useAppStore((s) => s.clients)
  const loading = useAppStore((s) => s.loading)
  const openClientDialog = useAppStore((s) => s.openClientDialog)
  const openClientEditDialog = useAppStore((s) => s.openClientEditDialog)
  const deleteClient = useAppStore((s) => s.deleteClient)
  const fetchClients = useAppStore((s) => s.fetchClients)
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'
  const isManager = role === 'Manager'
  const canManageSettings = isAdmin || isManager

  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const resetDefaults = useSettingsStore((s) => s.resetDefaults)

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'system' | 'companies-mgmt'>('general')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Company management state
  const [companies, setCompanies] = useState<any[]>([])
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [companyActive, setCompanyActive] = useState(true)
  const [companyBusy, setCompanyBusy] = useState(false)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<number | null>(null)
  const [deletingCompany, setDeletingCompany] = useState(false)
  const [deleteCompanyError, setDeleteCompanyError] = useState<string | null>(null)

  const { toast } = useToast()

  const availableTabs: readonly ('general' | 'companies' | 'system' | 'companies-mgmt')[] = isAdmin
    ? ['general', 'companies', 'system', 'companies-mgmt']
    : canManageSettings
      ? ['general', 'companies', 'system']
      : ['general']

  useEffect(() => {
    if (clients.length === 0) {
      void fetchClients()
    }
  }, [clients.length, fetchClients])

  useEffect(() => {
    if (activeTab === 'companies-mgmt' && companies.length === 0) {
      void fetchCompanies()
    }
  }, [activeTab])

  const fetchCompanies = async () => {
    try {
      const data = await api.companies.list()
      setCompanies(data)
    } catch (e) {
      console.error('Failed to fetch companies:', e)
    }
  }

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const filtered = useMemo(() => {
    const term = searchTerm.trim()
    if (!term) return clients
    return clients.filter(
      (c) =>
        c.name.includes(term) ||
        (c.primaryContactName ?? '').includes(term) ||
        (c.primaryContactPhone ?? '').includes(term)
    )
  }, [clients, searchTerm])

  const handleDeleteClient = async () => {
    if (deleteTarget == null) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteClient(deleteTarget)
      setDeleteTarget(null)
      successToast('تم حذف الجهة بنجاح')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const deleteClientName = clients.find((c) => c.id === deleteTarget)?.name ?? ''

  // Company management functions
  const openCompanyDialog = () => {
    setEditingCompany(null)
    setCompanyName('')
    setCompanyCode('')
    setCompanyDescription('')
    setCompanyActive(true)
    setCompanyError(null)
    setCompanyDialogOpen(true)
  }

  const openCompanyEditDialog = (company: any) => {
    setEditingCompany(company)
    setCompanyName(company.name)
    setCompanyCode(company.code)
    setCompanyDescription(company.description ?? '')
    setCompanyActive(company.isActive)
    setCompanyError(null)
    setCompanyDialogOpen(true)
  }

  const closeCompanyDialog = () => {
    setCompanyDialogOpen(false)
    setEditingCompany(null)
  }

  const handleCompanySubmit = async () => {
    if (!companyName.trim()) {
      setCompanyError('اسم الشركة مطلوب')
      return
    }
    if (!companyCode.trim()) {
      setCompanyError('كود الشركة مطلوب')
      return
    }

    setCompanyBusy(true)
    setCompanyError(null)
    try {
      const body = {
        name: companyName.trim(),
        code: companyCode.trim().toUpperCase(),
        description: companyDescription.trim() || null,
        isActive: companyActive,
      }

      if (editingCompany) {
        await api.companies.update(editingCompany.id, body)
        successToast('تم تعديل الشركة بنجاح')
      } else {
        await api.companies.create(body)
        successToast('تمت إضافة الشركة بنجاح')
      }
      closeCompanyDialog()
      await fetchCompanies()
    } catch (e) {
      setCompanyError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ الشركة')
    } finally {
      setCompanyBusy(false)
    }
  }

  const handleDeleteCompany = async () => {
    if (deleteCompanyTarget == null) return
    setDeletingCompany(true)
    setDeleteCompanyError(null)
    try {
      await api.companies.remove(deleteCompanyTarget)
      setDeleteCompanyTarget(null)
      successToast('تم حذف الشركة بنجاح')
      await fetchCompanies()
    } catch (e) {
      setDeleteCompanyError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeletingCompany(false)
    }
  }

  const deleteCompanyName = companies.find((c) => c.id === deleteCompanyTarget)?.name ?? ''

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-10">
        <div>
          <Skeleton className="h-8 w-48 rounded-lg mb-2" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-3 w-24 rounded mb-4" />
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div>
                <Skeleton className="h-4 w-32 rounded mb-2" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          إدارة التفضيلات العامة والجهات والشركات وبيانات النظام
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="flex h-auto w-1/2 items-center gap-3 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-b-transparent bg-transparent px-1 py-3 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            عام
          </TabsTrigger>
          {availableTabs.includes('companies') && (
            <TabsTrigger
              value="companies"
              className="rounded-none border-b-2 border-b-transparent bg-transparent px-1 py-3 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              الجهات والشركات
            </TabsTrigger>
          )}
          {availableTabs.includes('system') && (
            <TabsTrigger
              value="system"
              className="rounded-none border-b-2 border-b-transparent bg-transparent px-1 py-3 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              النظام
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-8">
          <p className="mb-4 text-[11px] font-bold text-muted-foreground tracking-wide">عام</p>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">الوضع</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  فاتح، داكن، أو تلقائي حسب إعدادات النظام
                </p>
              </div>
              <Select
                value={theme}
                onValueChange={(value) => {
                  setTheme(value as typeof theme)
                  successToast('تم حفظ الإعدادات تلقائياً')
                }}
              >
                <SelectTrigger className="w-52 text-sm">
                  <SelectValue placeholder="اختر الوضع" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">استعادة الافتراضيات</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  إعادة جميع الإعدادات إلى قيمها الافتراضية
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  resetDefaults()
                  successToast('تمت استعادة الافتراضيات')
                }}
                className="text-xs font-semibold"
              >
                استعادة
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                الجهات والشركات
              </p>
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                {clients.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="بحث بالاسم أو مسؤول التواصل أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm max-w-xs"
              />
              {canManageSettings && (
                <Button
                  onClick={openClientDialog}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-8"
                >
                  + إضافة جهة
                </Button>
              )}
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-base font-black">لا توجد جهات مسجلة بعد</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                أضف الجهة / الشركة المتعامل معها أولاً، ثم سجّل عملاءها من صفحة العملاء
              </p>
              {canManageSettings && (
                <Button
                  onClick={openClientDialog}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
                >
                  + إضافة جهة
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                    الجهة / الشركة
                  </TableHead>
                  <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                    مسؤول التواصل
                  </TableHead>
                  <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                    رقم الهاتف
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    العملاء
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    طلبات مفتوحة
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    فائزة
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    إجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      لا توجد نتائج مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((client) => (
                    <TableRow
                      key={client.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="px-5 py-3.5">
                        <span className="text-sm font-bold">{client.name}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm">
                        {client.primaryContactName ?? '—'}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm" dir="ltr">
                        {client.primaryContactPhone ?? '—'}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-black tabular-nums text-primary">
                          {client.plants.length}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-black tabular-nums text-primary">
                          {client.openRequisitions}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-bold tabular-nums text-green-700 dark:text-green-400">
                          {client.totalWon}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => navigate(`/clients?company=${client.id}`)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            العملاء
                          </button>
                          <button
                            onClick={() => openClientEditDialog(client)}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            تعديل
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setDeleteTarget(client.id)
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-8">
          <p className="mb-4 text-[11px] font-bold text-muted-foreground tracking-wide">النظام</p>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">إصدار النظام</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">نسخة التطبيق الحالية</p>
              </div>
              <span className="font-mono text-sm font-black text-primary" dir="ltr">
                {APP_VERSION}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">قاعدة البيانات</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  قاعدة بيانات محلية (SQLite)
                </p>
              </div>
              <span className="text-sm font-bold text-muted-foreground">محلية</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">نسخة احتياطية</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  تصدير جميع البيانات إلى ملف JSON — غير متاح في هذه النسخة
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="text-xs font-semibold disabled:opacity-40"
              >
                تصدير
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">مسح جميع البيانات</p>
                <p className="mt-0.5 text-[11px] text-red-700/70 dark:text-red-400/70">
                  حذف جميع الطلبات والعملاء والجهات نهائياً — غير متاح في هذه النسخة
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="text-xs font-semibold text-red-700 dark:text-red-400 disabled:opacity-40"
              >
                مسح البيانات
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="companies-mgmt" className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
                إدارة الشركات
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={openCompanyDialog}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-8"
              >
                + إضافة شركة
              </Button>
            </div>
          </div>

          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-base font-black">لا توجد شركات مسجلة بعد</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                أضف شركة تشغيلية جديدة لبدء إدارة المستخدمين والعملاء والطلبات بشكل منفصل
              </p>
              <Button
                onClick={openCompanyDialog}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
              >
                + إضافة شركة
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                    الشركة
                  </TableHead>
                  <TableHead className="px-5 text-[11px] font-bold text-muted-foreground tracking-wide">
                    الكود
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    المستخدمون
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    العملاء
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    العملاء (المصانع)
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    الطلبات
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    الحالة
                  </TableHead>
                  <TableHead className="px-5 text-center text-[11px] font-bold text-muted-foreground tracking-wide">
                    إجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      لا توجد شركات
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow
                      key={company.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="px-5 py-3.5">
                        <span className="text-sm font-bold">{company.name}</span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm" dir="ltr">
                        {company.code}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-black tabular-nums text-primary">
                          {company.usersCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-black tabular-nums text-primary">
                          {company.clientsCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-black tabular-nums text-primary">
                          {company.plantsCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <span className="text-sm font-bold tabular-nums text-primary">
                          {company.requisitionsCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <Badge
                          variant={company.isActive ? 'default' : 'outline'}
                          className="rounded-full py-0"
                        >
                          {company.isActive ? 'نشطة' : 'معطلة'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => openCompanyEditDialog(company)}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => {
                              setDeleteCompanyTarget(company.id)
                              setDeleteCompanyError(null)
                            }}
                            className="text-xs font-semibold text-red-700 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف الجهة{' '}
              <span className="font-bold text-foreground">{deleteClientName}</span>؟ لا يمكن الحذف
              إذا كانت الجهة مرتبطة بعملاء.
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
              onClick={handleDeleteClient}
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

      {/* Company Dialog */}
      <AlertDialog open={companyDialogOpen} onOpenChange={(open) => !open && closeCompanyDialog()}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">
              {editingCompany ? 'تعديل الشركة' : 'إضافة شركة جديدة'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {editingCompany
                ? 'قم بتعديل بيانات الشركة التشغيلية'
                : 'أضف شركة تشغيلية جديدة لإدارة المستخدمين والعملاء والطلبات بشكل منفصل'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">اسم الشركة</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: الشركة الأولى للمقاولات"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">الكود</label>
              <Input
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="مثال: CMP1"
                dir="ltr"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">الوصف</label>
              <textarea
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="وصف مختصر للشركة (اختياري)"
                className="h-20 text-sm p-2 rounded-lg border border-input bg-background"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="company-active"
                  checked={companyActive}
                  onChange={(e) => setCompanyActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="company-active" className="text-sm font-medium">
                  نشطة
                </label>
              </div>
            </div>

            {companyError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {companyError}
              </p>
            )}
          </div>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleCompanySubmit}
              disabled={companyBusy}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              {companyBusy ? 'جارٍ الحفظ...' : editingCompany ? 'حفظ التعديلات' : 'حفظ الشركة'}
            </Button>
            <Button
              variant="outline"
              onClick={closeCompanyDialog}
              disabled={companyBusy}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Company Confirmation */}
      <AlertDialog open={deleteCompanyTarget != null} onOpenChange={(open) => !open && setDeleteCompanyTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف الشركة{' '}
              <span className="font-bold text-foreground">{deleteCompanyName}</span>؟ لا يمكن الحذف
              إذا كانت الشركة مرتبطة بمستخدمين أو عملاء أو طلبات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteCompanyError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {deleteCompanyError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full text-xs font-bold"
              disabled={deletingCompany}
              onClick={handleDeleteCompany}
            >
              {deletingCompany ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteCompanyTarget(null)}
              disabled={deletingCompany}
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