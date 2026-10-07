import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { THEME_OPTIONS, useSettingsStore } from '@/store/useSettingsStore'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'

  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const resetDefaults = useSettingsStore((s) => s.resetDefaults)

  const [activeTab, setActiveTab] = useState<'general' | 'system'>('general')

  const { toast } = useToast()

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  return (
    <div dir="rtl" className="space-y-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          إدارة التفضيلات العامة وبيانات النظام
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="flex h-auto w-1/2 items-center gap-3 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-b-transparent bg-transparent px-1 py-3 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            عام
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="system"
              className="rounded-none border-b-2 border-b-transparent bg-transparent px-1 py-3 text-sm font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              النظام
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-8">
          <p className="mb-4 text-[11px] font-bold text-muted-foreground tracking-wide">عام</p>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">الوضع</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  فاتح، داكن، أو تلقائي حسب إعدادات النظام
                </p>
              </div>
              <Select
                value={theme}
                onValueChange={(value) => {
                  setTheme(value as typeof theme)
                  successToast('تم حفظ الإعدادات تلقائياً')
                }}
              >
                <SelectTrigger className="w-52 text-sm">
                  <SelectValue placeholder="اختر الوضع" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">استعادة الافتراضيات</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  إعادة جميع الإعدادات إلى قيمها الافتراضية
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  resetDefaults()
                  successToast('تمت استعادة الافتراضيات')
                }}
                className="text-xs font-semibold"
              >
                استعادة
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-8">
          <p className="mb-4 text-[11px] font-bold text-muted-foreground tracking-wide">النظام</p>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">إصدار النظام</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">نسخة التطبيق الحالية</p>
              </div>
              <span className="font-mono text-sm font-black text-primary" dir="ltr">
                {APP_VERSION}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">قاعدة البيانات</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  قاعدة بيانات محلية (SQLite)
                </p>
              </div>
              <span className="text-sm font-bold text-muted-foreground">محلية</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold">نسخة احتياطية</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  تصدير جميع البيانات إلى ملف JSON — غير متاح في هذه النسخة
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="text-xs font-semibold disabled:opacity-40"
              >
                تصدير
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">مسح جميع البيانات</p>
                <p className="mt-0.5 text-[11px] text-red-700/70 dark:text-red-400/70">
                  حذف جميع الطلبات والعملاء والجهات نهائياً — غير متاح في هذه النسخة
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="text-xs font-semibold text-red-700 dark:text-red-400 disabled:opacity-40"
              >
                مسح البيانات
              </Button>
            </div>
          </div>
        </TabsContent>

      </Tabs>

    </div>
  )
}