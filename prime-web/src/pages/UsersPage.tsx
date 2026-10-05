import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useToast } from '@/hooks/use-toast'
import { formatRelativeTime } from '@/lib/format'
import type { UserDto } from '@/lib/types'
import { useAuthStore } from '@/store/useAuthStore'

type SortKey = 'username' | 'displayName' | 'role' | 'isActive' | 'lastLoginAt'
type SortDir = 'asc' | 'desc' | null

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'displayName', label: 'المستخدم' },
  { key: 'role', label: 'الدور' },
  { key: 'isActive', label: 'الحالة' },
  { key: 'lastLoginAt', label: 'آخر دخول' },
]

const PAGE_SIZE = 10

function roleLabel(role: UserDto['role']) {
  if (role === 'Admin') return 'مسؤول النظام'
  if (role === 'Manager') return 'مدير'
  return 'مستخدم قياسي'
}

export function UsersPage() {
  const navigate = useNavigate()
  const users = useAuthStore((s) => s.users)
  const fetchUsers = useAuthStore((s) => s.fetchUsers)
  const resetUserPassword = useAuthStore((s) => s.resetUserPassword)
  const deleteUser = useAuthStore((s) => s.deleteUser)
  const currentUser = useAuthStore((s) => s.user)

  const { toast } = useToast()

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(1)

  const [resetTarget, setResetTarget] = useState<UserDto | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'تعذر تحميل المستخدمين.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchUsers])

  const openUserForm = (user?: UserDto) => {
    navigate(user ? `/users/${user.id}/edit` : '/users/new')
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    if (resetPassword.length < 8) {
      setResetError('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف')
      return
    }
    setResetBusy(true)
    setResetError(null)
    try {
      await resetUserPassword(resetTarget.id, resetPassword)
      setResetTarget(null)
      setResetPassword('')
      successToast('تمت إعادة تعيين كلمة المرور بنجاح')
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'حدث خطأ أثناء إعادة التعيين')
    } finally {
      setResetBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      successToast('تم حذف المستخدم بنجاح')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeleteBusy(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('ar')
    if (!term) return users
    return users.filter((user) =>
      [user.username, user.displayName, roleLabel(user.role)]
        .some((value) => value.toLocaleLowerCase('ar').includes(term)),
    )
  }, [searchTerm, users])

  const sorted = useMemo(() => {
    const list = [...filteredUsers]
    if (sortKey && sortDir) {
      list.sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        const cmp = av.localeCompare(bv, 'ar')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [filteredUsers, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="mb-2 h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-11 w-full max-w-md rounded-lg" />
        <Card className="space-y-4 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </Card>
      </div>
    )
  }

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">المستخدمون</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            إدارة حسابات الدخول والأدوار وصلاحيات النظام
          </p>
        </div>
        <Button
          onClick={() => navigate('/users/new')}
          className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          إضافة مستخدم
        </Button>
      </header>

      {loadError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      )}

      <section aria-label="ملخص المستخدمين" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { title: 'إجمالي المستخدمين', value: users.length },
          { title: 'الحسابات النشطة', value: users.filter((user) => user.isActive).length },
          { title: 'الحسابات المعطلة', value: users.filter((user) => !user.isActive).length },
        ].map((stat) => (
          <Card key={stat.title} className="p-5">
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">{stat.title}</p>
            <p className="text-2xl font-black tabular-nums">{stat.value}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <label htmlFor="users-search" className="text-sm font-bold">البحث في المستخدمين</label>
        <Input
          id="users-search"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value)
            setPage(1)
          }}
          placeholder="ابحث بالاسم أو اسم المستخدم أو الدور..."
          className="h-11 w-full max-w-md text-sm"
        />
      </section>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <h2 className="text-base font-black text-foreground">لا يوجد مستخدمون بعد</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            أضف أول مستخدم للسماح بالدخول إلى النظام
          </p>
          <Button
            onClick={() => navigate('/users/new')}
            className="h-11 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            إضافة مستخدم
          </Button>
        </div>
      ) : (
          <Card className="overflow-hidden">
            <Table className="min-w-[760px]">
              <caption className="sr-only">
                قائمة المستخدمين — {sorted.length} مستخدم، صفحة {page} من {totalPages}
              </caption>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  {COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      scope="col"
                      aria-sort={
                        sortKey === col.key && sortDir
                          ? sortDir === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                      className="px-5"
                    >
                      <button
                        onClick={() => handleSort(col.key)}
                        className="inline-flex min-h-10 items-center text-start text-[11px] font-bold tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {col.label}
                        {sortKey === col.key && sortDir && (
                          <span aria-hidden="true" className="ms-1 text-[10px] font-bold">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead scope="col" className="px-5 text-center">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      لا توجد نتائج مطابقة لبحثك
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((user) => (
                    <TableRow key={user.id} className="motion-reduce:transition-none">
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold"
                          >
                            {(user.displayName || user.username).trim().charAt(0).toLocaleUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {user.displayName || user.username}
                              {user.id === currentUser?.id && (
                                <span className="ms-2 text-[10px] font-bold text-muted-foreground">
                                  (أنت)
                                </span>
                              )}
                            </span>
                            <span dir="ltr" className="mt-0.5 block truncate text-start font-mono text-[11px] text-muted-foreground">
                              @{user.username}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm">
                        {roleLabel(user.role)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className={`rounded-full py-0 ${
                            user.isActive
                              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {user.isActive ? 'نشط' : 'معطل'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : '—'}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label={`إجراءات المستخدم ${user.username}`}
                              className="min-h-10 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                            >
                              إجراءات
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            <DropdownMenuItem onClick={() => openUserForm(user)}>
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setResetTarget(user)
                                setResetPassword('')
                                setResetError(null)
                              }}
                            >
                              إعادة تعيين كلمة المرور
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.id !== currentUser?.id && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTarget(user)
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
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
              <span className="text-xs text-muted-foreground">
                عرض {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} من إجمالي {sorted.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="min-h-10 rounded-md px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-30"
                >
                  السابق
                </button>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-10 rounded-md px-3 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-30"
                >
                  التالي
                </button>
              </div>
            </div>
          </Card>
      )}

      <Dialog
        open={resetTarget != null}
        onOpenChange={(open) => !open && !resetBusy && setResetTarget(null)}
      >
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription className="text-xs">
              تعيين كلمة مرور جديدة للمستخدم{' '}
              <span dir="ltr" className="font-bold text-foreground">
                {resetTarget?.username}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleResetPassword()
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="reset-user-password">كلمة المرور الجديدة</Label>
              <Input
                id="reset-user-password"
                dir="ltr"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                aria-invalid={Boolean(resetError)}
                aria-describedby={resetError ? 'reset-user-password-error' : undefined}
                className="h-11 text-sm"
              />
            </div>

            {resetError && (
              <p id="reset-user-password-error" role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                {resetError}
              </p>
            )}

            <div className="flex flex-col gap-3 min-[480px]:flex-row">
              <Button
                type="submit"
                disabled={resetBusy}
                aria-busy={resetBusy}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold min-[480px]:w-auto"
              >
                {resetBusy ? 'جارٍ الحفظ…' : 'إعادة التعيين'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetTarget(null)}
                disabled={resetBusy}
                className="h-11 w-full text-xs font-semibold min-[480px]:w-auto"
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف المستخدم{' '}
              <span dir="ltr" className="font-bold text-foreground">
                {deleteTarget?.username}
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteBusy}
              aria-busy={deleteBusy}
              className="h-11 w-full text-xs font-bold"
            >
              {deleteBusy ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
              className="h-11 w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}