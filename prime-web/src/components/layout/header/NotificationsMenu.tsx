import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatRelativeTime } from '@/lib/format'
import type { NotificationDto } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { HEADER_TEXT } from './constants'

interface HeaderNotification {
  id: number
  title: string
  message: string
  createdAt: string
  read: boolean
  href?: string
}

interface NotificationsMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toHeaderNotification(notification: NotificationDto): HeaderNotification {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
    ...(notification.requisitionId == null
      ? {}
      : { href: `/requisitions/${notification.requisitionId}` }),
  }
}

export function NotificationsMenu({ open, onOpenChange }: NotificationsMenuProps) {
  const navigate = useNavigate()
  const notifications = useAppStore((state) => state.notifications)
  const unreadCount = useAppStore((state) => state.notificationUnread)
  const markRead = useAppStore((state) => state.markNotificationRead)
  const markAllRead = useAppStore((state) => state.markAllNotificationsRead)
  const items = notifications.map(toHeaderNotification)

  const openNotification = (notification: HeaderNotification) => {
    if (!notification.read) void markRead(notification.id)
    onOpenChange(false)
    if (notification.href) navigate(notification.href)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? HEADER_TEXT.notificationUnread(unreadCount)
              : HEADER_TEXT.notifications
          }
          title={HEADER_TEXT.notifications}
          className="relative size-10 shrink-0 rounded-lg"
        >
          <Bell aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute end-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(340px,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="text-sm font-semibold">{HEADER_TEXT.notifications}</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
            className="min-h-10 px-2 text-xs"
          >
            {HEADER_TEXT.markAllRead}
          </Button>
        </div>
        <div className="max-h-[360px] overflow-y-auto border-t border-border">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {HEADER_TEXT.noNotifications}
            </p>
          ) : (
            <ul className="p-1">
              {items.map((notification) => {
                const isUnread = !notification.read
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="flex min-h-14 w-full items-start gap-3 rounded-md px-3 py-3 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {isUnread && (
                          <span
                            aria-hidden="true"
                            className="size-2 rounded-full bg-primary"
                          >
                            <span className="sr-only">{HEADER_TEXT.unreadIndicator}</span>
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {notification.title}
                        </span>
                        {notification.message && (
                          <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                            {notification.message}
                          </span>
                        )}
                        <time
                          dateTime={notification.createdAt}
                          className="mt-1 block text-xs text-muted-foreground"
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
