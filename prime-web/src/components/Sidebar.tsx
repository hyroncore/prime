import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import { HEADER_TEXT } from '@/components/layout/header/constants'

const USER_SECTIONS = [
  { to: '/dashboard/user', label: 'لوحة المعلومات' },
  { to: '/requisitions', label: 'طلبات الشراء' },
  { to: '/clients', label: 'العملاء' },
  { to: '/settings', label: 'الإعدادات' },
]

const MANAGER_SECTIONS = [
  { to: '/dashboard/manager', label: 'لوحة معلومات الفريق' },
  { to: '/workflow', label: 'تدفق العمل' },
  { to: '/requisitions', label: 'طلبات الشراء' },
  { to: '/clients', label: 'العملاء' },
  { to: '/settings', label: 'الإعدادات' },
]

const ADMIN_SECTIONS = [
  { to: '/dashboard/admin', label: 'لوحة معلومات النظام' },
  { to: '/clients', label: 'العملاء' },
  { to: '/users', label: 'المستخدمون' },
  { to: '/settings', label: 'الإعدادات' },
]

export function Sidebar() {
  const role = useAuthStore((state) => state.user?.role)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)

  const sections =
    role === 'Admin' ? ADMIN_SECTIONS : role === 'Manager' ? MANAGER_SECTIONS : USER_SECTIONS
  const closeOnMobile = () => setSidebarOpen(false)
  const sidebarClassName = sidebarOpen
    ? 'fixed inset-y-0 end-0 z-50 flex h-screen w-60'
    : 'hidden lg:sticky lg:top-0 lg:z-auto lg:flex lg:h-screen lg:w-60'

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label={HEADER_TEXT.sidebarClose}
          title={HEADER_TEXT.sidebarClose}
          onClick={closeOnMobile}
          className="fixed inset-0 z-40 bg-background/80 lg:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        dir="rtl"
        className={cn(
          sidebarClassName,
          'shrink-0 flex-col border-e border-border bg-background print:hidden lg:sticky'
        )}
      >
        <div className="flex items-center gap-3 px-5 pb-6 pt-7">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <span className="text-base font-black text-primary-foreground">P</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight text-primary">Prime</p>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              نظام تتبع طلبات الشراء
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {sections.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              onClick={closeOnMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-center text-xs font-medium text-muted-foreground">Prime v1.0</p>
        </div>
      </aside>
    </>
  )
}
