import { Link, useNavigate } from 'react-router-dom'
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
import { HEADER_TEXT } from './constants'
import { ThemeToggle } from './ThemeToggle'

interface UserMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word.charAt(0)).join('') || HEADER_TEXT.initialFallback
}

export function UserMenu({ open, onOpenChange }: UserMenuProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={HEADER_TEXT.userMenu}
          title={HEADER_TEXT.userMenu}
          className="flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="size-9">
            <AvatarFallback className="text-sm font-semibold">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="px-3 py-2 font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{user.displayName}</p>
          <p dir="ltr" className="mt-0.5 truncate text-start text-xs text-muted-foreground">
            @{user.username}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10">
          <Link to="/account">{HEADER_TEXT.account}</Link>
        </DropdownMenuItem>
        <ThemeToggle />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleLogout}
          className="min-h-10 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          {HEADER_TEXT.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
