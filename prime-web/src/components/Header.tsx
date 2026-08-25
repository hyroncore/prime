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

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const handleLogout = () => {
    logout()
    window.location.assign('/login')
  }

  const renderUserMenu = () => {
    if (!user) return null
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
            <User className="h-4 w-4" />
            الحساب
          </DropdownMenuItem>
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