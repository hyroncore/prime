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
  { key: 'username', label: 'اسم المستخدم' },
  { key: 'displayName', label: 'اسم العرض' },
  { key: 'role', label: 'الدور' },
  { key: 'isActive', label: 'الحالة' },
  { key: 'lastLoginAt', label: 'آخر دخول' },
]

const PAGE_SIZE = 10

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
    void fetchUsers().finally(() => setLoading(false))
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

  const sorted = useMemo(() => {
    const list = [...users]
    if (sortKey && sortDir) {
      list.sort((a, b) => {
        const av = String(a[sortKey as keyof typeof a] ?? '')
        const bv = String(b[sortKey as keyof typeof b] ?? '')
        const cmp = av.localeCompare(bv, 'ar')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return list
  }, [users, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    setSortKey(key)
    setSortDir((prev) => {
      if (prev === null) return 'asc'
      if (prev === 'asc') return 'desc'
      return null
    })
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 rounded-lg mb-2" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-t border-border first:border-t-0">
              {Array.from({ length: 5 }).map((_, j) => (
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
          <h1 className="text-2xl font-black tracking-tight">المستخدمون</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة حسابات الدخول والأدوار وصلاحيات النظام
          </p>
        </div>
        <Button onClick={() => navigate('/users/new')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
          + إضافة مستخدم
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-base font-black text-foreground">لا يوجد مستخدمون بعد</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            أضف أول مستخدم للسماح بالدخول إلى النظام
          </p>
          <Button onClick={() => navigate('/users/new')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
            + إضافة مستخدم
          </Button>
        </div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <caption className="sr-only">قائمة المستخدمين — {sorted.length} مستخدم، صفحة {page} من {totalPages}</caption>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  {COLUMNS.map((col, index) => (
                    <TableHead key={`${col.key}-${index}`} className="px-5">
                      <button
                        onClick={() => handleSort(col.key)}
                        aria-label={`ترتيب حسب ${col.label}`}
                        aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
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
                    <TableCell colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="px-5 py-3.5">
                        <span dir="ltr" className="font-mono text-sm font-bold text-primary">
                          {user.username}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm">
                        {user.displayName}
                        {user.id === currentUser?.id && (
                          <span className="ms-2 text-[10px] font-bold text-muted-foreground">
                            (أنت)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-sm">
                        {user.role === 'Admin' ? 'مسؤول' : user.role === 'Manager' ? 'مدير' : 'مستخدم قياسي'}
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
                            <button className="rounded-md px-2.5 py-1 text-sm font-black tracking-widest text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                              •••
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
          </Card>
        </>
      )}

      <Dialog open={resetTarget != null} onOpenChange={(o) => !o && setResetTarget(null)}>
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

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                dir="ltr"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="h-9 text-sm"
              />
            </div>

            {resetError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {resetError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void handleResetPassword()}
              disabled={resetBusy}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              {resetBusy ? 'جارٍ الحفظ...' : 'إعادة التعيين'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setResetTarget(null)}
              disabled={resetBusy}
              className="w-full text-xs font-semibold"
            >
              إلغاء
            </Button>
          </div>
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
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteBusy}
              className="w-full text-xs font-bold"
            >
              {deleteBusy ? 'جارٍ الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
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