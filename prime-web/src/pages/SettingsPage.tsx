import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { THEME_OPTIONS, useSettingsStore } from '@/store/useSettingsStore'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'Admin')
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const resetDefaults = useSettingsStore((state) => state.resetDefaults)
  const { toast } = useToast()

  const showSavedMessage = () => toast({ title: 'تم حفظ الإعدادات' })

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">الإعدادات</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          تخصيص مظهر التطبيق ومراجعة معلومات النظام
        </p>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black">التفضيلات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <label htmlFor="theme-preference" className="text-sm font-bold">
                مظهر التطبيق
              </label>
              <p className="text-xs text-muted-foreground">
                اختر المظهر الفاتح أو الداكن أو اتبع إعدادات جهازك.
              </p>
            </div>
            <Select
              value={theme}
              onValueChange={(value) => {
                const option = THEME_OPTIONS.find((item) => item.value === value)
                if (!option) return
                setTheme(option.value)
                showSavedMessage()
              }}
            >
              <SelectTrigger
                id="theme-preference"
                aria-label="مظهر التطبيق"
                className="h-11 w-full sm:w-56"
              >
                <SelectValue placeholder="اختر المظهر" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold">استعادة المظهر الافتراضي</p>
              <p className="text-xs text-muted-foreground">
                إعادة اختيار المظهر التلقائي حسب إعدادات الجهاز.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetDefaults()
                showSavedMessage()
              }}
              className="min-h-11 w-full text-xs font-semibold sm:w-auto"
            >
              استعادة الافتراضي
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-black">معلومات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground">إصدار التطبيق</p>
                <p className="text-sm font-semibold" dir="ltr">
                  {APP_VERSION}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground">قاعدة البيانات</p>
                <p className="text-sm font-semibold">PostgreSQL</p>
                <p className="text-xs text-muted-foreground">
                  تتم إدارة اتصال قاعدة البيانات من الخادم.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
