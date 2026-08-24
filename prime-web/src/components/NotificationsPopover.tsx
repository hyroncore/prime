import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatRelativeTime, NOTIFICATION_META } from '@/lib/format'
import type { NotificationDto } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'

export function NotificationsPopover() {
  const notifications = useAppStore((s) => s.notifications)
  const unread = useAppStore((s) => s.notificationUnread)
  const markRead = useAppStore((s) => s.markNotificationRead)
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead)
  const openRequisition = useAppStore((s) => s.openDrawer)
  const [open, setOpen] = useState(false)

  const openNotification = (n: NotificationDto) => {
    if (!n.readAt) void markRead(n.id)
    setOpen(false)
    if (n.requisitionId) void openRequisition(n.requisitionId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="الإشعارات"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/30 transition-colors hover:bg-muted/70"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-black">الإشعارات</p>
          {unread > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="flex items-center gap-1.5 text-[11px] font-bold text-primary transition-colors hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              تحديد الكل كمقروء
            </button>
          )}
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto border-t border-border">
          {notifications.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
          ) : (
            <ul className="p-1">
              {notifications.map((n) => {
                const meta =
                  NOTIFICATION_META[n.type] ?? {
                    label: n.type,
                    tone: 'bg-muted text-muted-foreground border-border',
                  }
                const isUnread = !n.readAt
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => openNotification(n)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-start transition-colors hover:bg-muted/50 ${
                        isUnread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <span
                        className={`mt-1 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs leading-relaxed ${
                            isUnread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground/70">
                          {n.identifier ? (
                            <span dir="ltr" className="font-mono font-semibold">
                              {n.identifier}
                            </span>
                          ) : null}
                          <span> · {formatRelativeTime(n.createdAt)}</span>
                        </span>
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