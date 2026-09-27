import { Moon, Sun, Bell, LogOut, User } from 'lucide-react'
import { NotificationsPopover } from '@/components/NotificationsPopover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/useAuthStore'
import { applyTheme, themeIsDark, useSettingsStore } from '@/store/useSettingsStore'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'
import { CompanyDto } from '@/lib/types'

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]).join('') || 'U'
}

export function Header() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const isDark = themeIsDark(theme)

  // Company switcher state
  const [companies, setCompanies] = useState<CompanyDto[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null)

  const isAdmin = user?.role === 'Admin'
  const userCompanyId = user?.companyId ?? null

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  const fetchCompanies = async () => {
    if (!isAdmin) return
    try {
      const data = await api.companies.list()
      setCompanies(data)
      // Set active company to user's current company
      if (userCompanyId) {
        setActiveCompanyId(userCompanyId)
      } else if (data.length > 0) {
        setActiveCompanyId(data[0].id)
      }
    } catch (e) {
      console.error('Failed to load companies:', e)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchCompanies()
    }
  }, [isAdmin])

  const handleCompanyChange = async (companyId: number) => {
    setActiveCompanyId(companyId)
    // In a real app, you'd update the user's company context here
    // For now, we'll just store it in localStorage
    localStorage.setItem('prime.active_company_id', String(companyId))
    window.location.reload()
  }

  const renderUserMenu = () => {
    if (!user) return null

    // Extract company switcher for cleaner JSX
    const companySwitcher = isAdmin && companies.length > 1 ? (
      <div>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuLabel className="px-3 py-1 text-xs font-semibold text-muted-foreground">
          الشركة الحالية
        </DropdownMenuLabel>
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleCompanyChange(company.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 ${
              activeCompanyId === company.id ? 'bg-primary/10 text-primary' : ''
            }`}
          >
            {activeCompanyId === company.id && (
              <span className="text-primary font-bold">✓</span>
            )}
            <span className="font-medium">{company.name}</span>
            <span className="text-[10px] text-muted-foreground">{company.code}</span>
          </DropdownMenuItem>
        ))}
      </div>
    ) : null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="حساب المستخدم"
            className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-1.5 text-foreground transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm font-semibold">
                {initialsOf(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold truncate max-w-[160px]">
                {user.displayName}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {user.role === 'Admin' ? 'مسؤول النظام' : 'مستخدم'}
              </p>
            </div>
            <User className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{user.displayName}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{user.username}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => window.location.href = '/account'}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50"
          >
            الحساب
          </DropdownMenuItem>
          {companySwitcher}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm print:hidden">
      {/* System name - left side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">نظام تتبع طلبات الشراء</p>
            <p className="text-[11px] text-muted-foreground">إدارة طلبات الشراء والموافقات</p>
          </div>
        </div>
      </div>

      {/* Actions - right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationsPopover />

        {/* Theme Toggle - clean icon button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User Menu */}
        {renderUserMenu()}
      </div>
    </header>
  )
}