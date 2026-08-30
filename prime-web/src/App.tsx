import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ClientFormDialog } from '@/components/ClientFormDialog'
import { Header } from '@/components/Header'
import { PlantFormDialog } from '@/components/PlantFormDialog'
import { RequisitionDrawer } from '@/components/RequisitionDrawer'
import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { ClientsPage } from '@/pages/ClientsPage'
import { DashboardRedirect } from '@/components/DashboardRedirect'
import { LoginPage } from '@/pages/LoginPage'
import { NewRequisitionPage } from '@/pages/NewRequisitionPage'
import { RequisitionDetailPage } from '@/pages/RequisitionDetailPage'
import { RequisitionEditPage } from '@/pages/RequisitionEditPage'
import { RequisitionsPage } from '@/pages/RequisitionsPage'
import { RequisitionPrintPage } from '@/pages/RequisitionPrintPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { UsersPage } from '@/pages/UsersPage'
import { AccountPage } from '@/pages/AccountPage'
import { UserDashboardPage } from '@/pages/UserDashboardPage'
import { ManagerDashboardPage } from '@/pages/ManagerDashboardPage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import { applyTheme, useSettingsStore } from '@/store/useSettingsStore'

function ThemeEngine() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return null
}

function GlobalErrorBanner() {
  const error = useAppStore((s) => s.error)
  const loading = useAppStore((s) => s.loading)
  const fetchAll = useAppStore((s) => s.fetchAll)
  const [retrying, setRetrying] = useState(false)

  if (!error || loading) return null

  const retry = async () => {
    setRetrying(true)
    try {
      await fetchAll()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
      <button
        onClick={() => void retry()}
        disabled={retrying}
        className="shrink-0 text-xs font-bold text-red-700 underline decoration-red-300 underline-offset-4 transition-colors hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
      >
        {retrying ? 'جارٍ المحاولة...' : 'إعادة المحاولة'}
      </button>
    </div>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const logout = useAuthStore((s) => s.logout)
  const [checking, setChecking] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    let cancelled = false
    setChecking(true)
    fetchMe()
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, fetchMe, logout])

  if (!token) return <LoginPage />
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="text-sm font-bold text-muted-foreground">جارٍ التحقق من الجلسة...</p>
      </div>
    )
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role)
  if (role !== 'Admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function NotificationsPoller() {
  const fetchNotifications = useAppStore((s) => s.fetchNotifications)

  useEffect(() => {
    void fetchNotifications()
    const interval = setInterval(() => void fetchNotifications(), 60_000)
    const onFocus = () => void fetchNotifications()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchNotifications])

  return null
}

export default function App() {
  const fetchAll = useAppStore((s) => s.fetchAll)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (token) void fetchAll()
  }, [fetchAll, token])

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <ThemeEngine />
      <AuthGate>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <Header />
            <main className="px-10 py-10 print:px-0 print:py-0">
              <GlobalErrorBanner />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route path="/dashboard/user" element={<UserDashboardPage />} />
                <Route path="/dashboard/manager" element={<ManagerDashboardPage />} />
                <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
                <Route path="/requisitions" element={<RequisitionsPage />} />
                <Route path="/requisitions/new" element={<NewRequisitionPage />} />
                <Route path="/requisitions/:id" element={<RequisitionDetailPage />} />
                <Route path="/requisitions/:id/edit" element={<RequisitionEditPage />} />
                <Route path="/requisitions/:id/print" element={<RequisitionPrintPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route
                  path="/users"
                  element={
                    <RequireAdmin>
                      <UsersPage />
                    </RequireAdmin>
                  }
                />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </div>

        <ClientFormDialog />
        <PlantFormDialog />
        <RequisitionDrawer />
        <NotificationsPoller />
        <Toaster />
      </AuthGate>
    </div>
  )
}