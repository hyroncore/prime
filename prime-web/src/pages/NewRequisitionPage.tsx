import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ar } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useArrowFieldNavigation } from '@/hooks/useArrowFieldNavigation'
import { useFileDropzone } from '@/hooks/useFileDropzone'
import { api } from '@/lib/api'
import { formatBytes, toDateKey, validateAttachment } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface FormValues {
  plantId: string
  sectorCode: string
  externalRef: string
  title: string
  dueDate: Date | undefined
  receivedAt: Date
  clientNotes: string
}

function RequiredMark() {
  return <span className="text-red-600"> *</span>
}

export function NewRequisitionPage() {
  const navigate = useNavigate()
  const plants = useAppStore((s) => s.plants)
  const sectors = useAppStore((s) => s.sectors)
  const createRequisition = useAppStore((s) => s.createRequisition)
  const openDrawer = useAppStore((s) => s.openDrawer)

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useArrowFieldNavigation(formRef)
  const { toast } = useToast()

  const handleFiles = (files: File[]) => {
    const errors: string[] = []
    const accepted: File[] = []
    for (const file of files) {
      const error = validateAttachment(file)
      if (error) errors.push(error)
      else accepted.push(file)
    }
    if (accepted.length > 0) setPendingFiles((prev) => [...prev, ...accepted])
    setFileErrors(errors)
  }

  const dropzone = useFileDropzone(handleFiles)

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const form = useForm<FormValues>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      plantId: '',
      sectorCode: '',
      externalRef: '',
      title: '',
      dueDate: undefined,
      receivedAt: new Date(),
      clientNotes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const created = await createRequisition({
        plantId: Number(values.plantId),
        sectorCode: values.sectorCode,
        externalRef: values.externalRef.trim(),
        title: values.title.trim(),
        dueDate: values.dueDate ? toDateKey(values.dueDate) : toDateKey(new Date()),
        receivedAt: toDateKey(values.receivedAt),
        clientNotes: values.clientNotes.trim() || null,
      })
      if (pendingFiles.length > 0) {
        let failures = 0
        for (const file of pendingFiles) {
          try {
            await api.requisitions.attachments.upload(created.id, file)
          } catch {
            failures += 1
          }
        }
        if (failures > 0) {
          toast({
            title: `تعذر رفع ${failures} من المرفقات (${pendingFiles.length})`,
            variant: 'destructive',
          })
        }
      }
      navigate('/requisitions', { state: { createdIdentifier: created.identifier } })
      void openDrawer(created.id)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">طلب شراء جديد</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            سيُولّد المعرف تلقائياً بصيغة [المصنع]-[القسم]-[تسلسل] مثل: LB-03-01C8
          </p>
        </div>
        <button
          onClick={() => navigate('/requisitions')}
          className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          رجوع ←
        </button>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
          <section className="space-y-4">
            <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
              العميل والقسم
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plantId"
                rules={{ required: 'يرجى اختيار المصنع' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      المصنع<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      {plants.length === 0 ? (
                        <div className="space-y-2">
                          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                            لا توجد مصانع — أضف عميلاً من صفحة العملاء أولاً
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            الانتقال إلى صفحة العملاء
                          </button>
                        </div>
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="اختر المصنع" />
                          </SelectTrigger>
                          <SelectContent>
                            {plants.map((plant) => (
                              <SelectItem key={plant.id} value={String(plant.id)}>
                                {plant.plantName} [{plant.shortCode}] - {plant.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    {plants.length > 0 && (
                      <FormDescription>المصنع التابع للجهة المعنية بالطلب</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sectorCode"
                rules={{ required: 'يرجى اختيار القسم' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      القسم<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((sector) => (
                            <SelectItem key={sector.code} value={sector.code}>
                              {sector.code} - {sector.nameArabic}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {sectors.length > 0 && (
                      <FormDescription>القسم المختص بالطلب (يدخل في تكوين المعرف)</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
              تفاصيل الطلب
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="externalRef"
                rules={{ required: 'يرجى إدخال المرجع الخارجي' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      المرجع الخارجي<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="مثال: SL75-2026"
                        dir="ltr"
                        className="h-9 text-sm text-left"
                      />
                    </FormControl>
                    <FormDescription>الرقم المرجعي الصادر من جهة العميل</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receivedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">تاريخ استلام الطلب</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className={cn(
                              'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/40',
                              field.value ? 'font-bold' : 'font-normal text-muted-foreground'
                            )}
                          >
                            <span dir="ltr" className="text-start tabular-nums">
                              {toDateKey(field.value)}
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground">▾</span>
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ar}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>تاريخ وصول الطلب من العميل (يمكن أن يكون سابقاً)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                rules={{ required: 'يرجى تحديد تاريخ الاستحقاق' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      تاريخ الاستحقاق<RequiredMark />
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className={cn(
                              'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/40',
                              field.value ? 'font-bold' : 'font-normal text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              <span dir="ltr" className="text-start tabular-nums">
                                {toDateKey(field.value)}
                              </span>
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <span className="text-[10px] font-black text-muted-foreground">▾</span>
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ar}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>آخر موعد لتقديم العرض</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                rules={{ required: 'يرجى إدخال عنوان الطلب' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold">
                      عنوان الطلب<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="وصف مختصر للطلب، مثال: توريد قطع غيار مضخات الأسمنت"
                        className="h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">ملاحظات العميل</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="أي تفاصيل إضافية وردت من العميل (اختياري)"
                      className="text-sm"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>اختياري — تظهر في تفاصيل الطلب وسجل التدقيق</FormDescription>
                </FormItem>
              )}
            />
          </section>

          <Separator />

          <section className="space-y-4">
            <p className="text-[11px] font-bold text-muted-foreground tracking-wide">المرفقات</p>
            <div
              {...dropzone.handlers}
              aria-label="منطقة إضافة المرفقات — اسحب الملفات وأفلتها هنا"
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                dropzone.isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  handleFiles(files)
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="text-xs font-bold text-primary transition-colors hover:underline disabled:opacity-50"
              >
                إضافة ملفات
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                اسحب الملفات وأفلتها هنا أو اختر من جهازك
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                pdf, doc, docx, xls, xlsx, dwg, zip وغيرها — الحد الأقصى 10 م.ب للملف الواحد
              </p>
            </div>

            {pendingFiles.length > 0 && (
              <div className="divide-y divide-border">
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${index}-${file.name}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p dir="ltr" className="truncate text-xs font-bold text-left">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={submitting}
                      className="shrink-0 text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50"
                    >
                      إزالة
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fileErrors.length > 0 && (
              <ul className="space-y-1">
                {fileErrors.map((error, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {serverError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {serverError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold active:scale-[0.98] sm:flex-none sm:px-10"
            >
              {submitting ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
            </Button>
            <button
              type="button"
              onClick={() => navigate('/requisitions')}
              disabled={submitting}
              className="self-center text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Form>
    </div>
  )
}