import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { Breadcrumbs } from './header/Breadcrumbs'
import { NotificationsMenu } from './header/NotificationsMenu'
import { HEADER_TEXT } from './header/constants'
import { UserMenu } from './header/UserMenu'

type OpenMenu = 'notifications' | 'user' | null

export function Header() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-40 flex h-14 w-full min-w-0 items-center gap-2 border-b border-border bg-background px-3 print:hidden sm:px-4"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? HEADER_TEXT.sidebarClose : HEADER_TEXT.sidebarOpen}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        title={sidebarOpen ? HEADER_TEXT.sidebarClose : HEADER_TEXT.sidebarOpen}
        className="size-10 shrink-0 rounded-lg lg:hidden"
      >
        {sidebarOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </Button>
      <Breadcrumbs />
      <div className="flex shrink-0 items-center gap-2">
        <NotificationsMenu
          open={openMenu === 'notifications'}
          onOpenChange={(open) => setOpenMenu(open ? 'notifications' : null)}
        />
        <UserMenu
          open={openMenu === 'user'}
          onOpenChange={(open) => setOpenMenu(open ? 'user' : null)}
        />
      </div>
    </header>
  )
}
