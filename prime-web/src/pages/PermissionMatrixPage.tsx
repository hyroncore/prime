import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/lib/api'
import type { PermissionMatrixDto, PermissionCellDto, PermissionDto, RolePermissionDto } from '@/lib/types'

const ROLES = ['Admin', 'Manager', 'User'] as const
type Role = typeof ROLES[number]

export function PermissionMatrixPage() {
  const matrix = useAppStore((s) => s.permissionMatrix)
  const loading = useAppStore((s) => s.loading)
  const setPermissionMatrix = useAppStore((s) => s.setPermissionMatrix)
  const setLoading = useAppStore((s) => s.setLoading)
  const setError = useAppStore((s) => s.setError)

  const [activeRoleTab, setActiveRoleTab] = useState<Role>('Admin')
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<number, boolean>>>({})

  useEffect(() => {
    let cancelled = false
    const fetchMatrix = async () => {
      try {
        setLoading(true)
        const data = await api.permissions.matrix()
        if (!cancelled) setPermissionMatrix(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load permission matrix')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchMatrix()
    return () => { cancelled = true }
  }, [setPermissionMatrix, setLoading, setError])

  if (loading && !matrix) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 rounded-lg mb-2" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
        </div>
        <Card>
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48 rounded" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!matrix) return null

  const getRoleRow = (role: Role): RolePermissionDto | undefined =>
    matrix.roles.find(r => r.role === role)

  const isGranted = (role: Role, permissionId: number): boolean => {
    const roleRow = getRoleRow(role)
    const cell = roleRow?.permissions.find(p => p.permissionId === permissionId)
    return cell?.isGranted ?? false
  }

  const togglePermission = (role: Role, permissionId: number, currentValue: boolean) => {
    const newValue = !currentValue
    setPendingChanges(prev => ({
      ...prev,
      [role]: { ...prev[role], [permissionId]: newValue }
    }))
  }

  const hasPendingChanges = (role: Role) => {
    const roleChanges = pendingChanges[role]
    return roleChanges && Object.keys(roleChanges).length > 0
  }

  const saveRolePermissions = async (role: Role) => {
    const roleChanges = pendingChanges[role]
    if (!roleChanges || Object.keys(roleChanges).length === 0) return

    const permissions: PermissionCellDto[] = Object.entries(roleChanges).map(([permissionId, isGranted]) => ({
      permissionId: Number(permissionId),
      permissionKey: '',
      isGranted
    }))

    try {
      setLoading(true)
      await api.permissions.updateRole(role, { permissions })
      setPendingChanges(prev => {
        const next = { ...prev }
        delete next[role]
        return next
      })
      // Refresh matrix
      const fresh = await api.permissions.matrix()
      setPermissionMatrix(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save permissions')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryPermissions = (category: string): PermissionDto[] =>
    matrix.permissions.filter(p => p.category === category).sort((a, b) => a.key.localeCompare(b.key))

  const categories = [...new Set(matrix.permissions.map(p => p.category))].sort()

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">مصفوفة الصلاحيات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة صلاحيات الأدوار والمستخدمين — تغييرات فورية عند الحفظ
          </p>
        </div>
      </div>

      <Card>
        <Tabs value={activeRoleTab} onValueChange={(v: string) => setActiveRoleTab(v as Role)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {ROLES.map(role => (
              <TabsTrigger key={role} value={role} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {role}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map(role => (
            <TabsContent key={role} value={role} className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">صلاحية دور: {role}</h2>
                {hasPendingChanges(role) && (
                  <Button
                    onClick={() => saveRolePermissions(role)}
                    disabled={loading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
                  >
                    حفظ التغييرات
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {getCategoryPermissions(category).map(perm => {
                        const granted = isGranted(role, perm.id)
                        const pending = pendingChanges[role]?.[perm.id]
                        const currentValue = pending !== undefined ? pending : granted
                        return (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={currentValue}
                              onChange={() => togglePermission(role, perm.id, currentValue)}
                              disabled={loading}
                              id={`perm-${role}-${perm.id}`}
                              className="h-4 w-4 shrink-0 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={`perm-${role}-${perm.id}`} className="font-medium text-sm cursor-pointer">
                                {perm.key}
                              </Label>
                              <p className="text-[11px] text-muted-foreground truncate">{perm.description}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">صلاحيات مستخدم محدد</h2>
          <p className="text-sm text-muted-foreground mb-4">
            تجاوز صلاحيات الدور لمستخدمين محددين — يُضاف إلى صلاحيات الدور الأساسي
          </p>
          <UserPermissionEditor />
        </div>
      </Card>
    </div>
  )
}

function UserPermissionEditor() {
  const [userId, setUserId] = useState<number | ''>('')
  const [userMatrix, setUserMatrix] = useState<PermissionMatrixDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<number, boolean>>({})

  const fetchUserPermissions = async () => {
    if (!userId) return
    try {
      setLoading(true)
      setError(null)
      const matrix = await api.permissions.matrix()
      setUserMatrix(matrix)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user permissions')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserPermission = (permissionId: number, currentValue: boolean) => {
    const newValue = !currentValue
    setPendingChanges(prev => ({ ...prev, [permissionId]: newValue }))
  }

  

  const saveUserPermissions = async () => {
    if (!userId || Object.keys(pendingChanges).length === 0) return
    const permissions: PermissionCellDto[] = Object.entries(pendingChanges).map(([permissionId, isGranted]) => ({
      permissionId: Number(permissionId),
      permissionKey: '',
      isGranted
    }))
    try {
      setSaving(true)
      await api.permissions.updateUser(userId, { permissions })
      setPendingChanges({})
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save user permissions')
    } finally {
      setSaving(false)
    }
  }

  if (!userMatrix) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="number"
          placeholder="معرف المستخدم"
          value={userId}
          onChange={e => setUserId(Number(e.target.value) || '')}
          className="w-32 px-3 py-2 text-sm border border-input rounded-lg bg-background"
        />
        <Button onClick={fetchUserPermissions} disabled={loading || !userId}>
          {loading ? 'جاري التحميل...' : 'تحميل الصلاحيات'}
        </Button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    )
  }

  const categories = [...new Set(userMatrix.permissions.map(p => p.category))].sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="number"
          placeholder="معرف المستخدم"
          value={userId}
          onChange={e => setUserId(Number(e.target.value) || '')}
          className="w-32 px-3 py-2 text-sm border border-input rounded-lg bg-background"
        />
        <Button onClick={fetchUserPermissions} disabled={loading || !userId}>
          {loading ? 'جاري التحميل...' : 'تغيير المستخدم'}
        </Button>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={saveUserPermissions} disabled={saving} className="bg-primary text-primary-foreground">
            {saving ? 'جاري الحفظ...' : 'حفظ تجاوزات المستخدم'}
          </Button>
        )}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <div className="space-y-6">
        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userMatrix.permissions.filter(p => p.category === category).sort((a, b) => a.key.localeCompare(b.key)).map(perm => {
                const pending = pendingChanges[perm.id]
                const currentValue = pending !== undefined ? pending : false
                return (
                  <label
                    key={perm.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={currentValue}
                      onChange={() => toggleUserPermission(perm.id, currentValue)}
                      disabled={saving}
                      id={`user-perm-${perm.id}`}
                      className="h-4 w-4 shrink-0 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`user-perm-${perm.id}`} className="font-medium text-sm cursor-pointer">
                        {perm.key}
                      </Label>
                      <p className="text-[11px] text-muted-foreground truncate">{perm.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}