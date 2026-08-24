import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

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

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-10 py-3.5 backdrop-blur print:hidden">
      <p className="text-xs font-bold text-muted-foreground">
        نظام تتبع طلبات الشراء
      </p>

      <div className="flex items-center gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="حساب المستخدم"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1 transition-colors hover:bg-muted/70"
              >
                <Avatar>
                  <AvatarFallback>{initialsOf(user.displayName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-start sm:block">
                  <span className="block max-w-32 truncate text-xs font-bold leading-tight">
                    {user.displayName}
                  </span>
                  <span className="block text-[10px] font-bold text-muted-foreground leading-tight">
                    {user.role === 'Admin' ? 'مسؤول' : 'مستخدم'}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="px-2 py-1.5">
                <span dir="ltr" className="block truncate font-mono text-[11px] font-semibold">
                  {user.username}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPasswordDialogOpen(true)}
                className="cursor-pointer text-xs font-semibold"
              >
                تغيير كلمة المرور
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-xs font-semibold text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
              >
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/70"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <NotificationsPopover />

        <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      </div>
    </header>
  )
}