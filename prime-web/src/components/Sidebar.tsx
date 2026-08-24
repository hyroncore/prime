import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const SECTIONS = [
  { to: '/dashboard', label: 'لوحة التحكم' },
  { to: '/requisitions', label: 'طلبات الشراء' },
  { to: '/clients', label: 'العملاء' },
  { to: '/settings', label: 'الإعدادات' },
]

export function Sidebar() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const sections = isAdmin
    ? [...SECTIONS.slice(0, 3), { to: '/users', label: 'المستخدمون' }, ...SECTIONS.slice(3)]
    : SECTIONS

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-l border-border bg-background print:hidden">
      <div className="flex items-center gap-3 px-5 pt-7 pb-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <span className="text-base font-black text-primary-foreground">P</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black tracking-tight text-primary">Prime</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            نظام تتبع طلبات الشراء
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
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
        <p className="text-[11px] font-medium text-muted-foreground text-center">
          Prime v1.0
        </p>
      </div>
    </aside>
  )
}