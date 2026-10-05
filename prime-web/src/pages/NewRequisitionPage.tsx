import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ar } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
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
  return <span className="text-destructive" aria-hidden="true"> *</span>
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
    shouldFocusError: true,
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
        let firstUploadError: string | null = null
        for (const file of pendingFiles) {
          try {
            await api.requisitions.attachments.upload(created.id, file)
          } catch (error) {
            failures += 1
            firstUploadError ??=
              error instanceof Error ? error.message : 'تعذر رفع أحد المرفقات'
          }
        }
        if (failures > 0) {
          toast({
            title: `تعذر رفع ${failures} من المرفقات (${pendingFiles.length})`,
            description: firstUploadError ?? undefined,
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
    <div dir="rtl" className="mx-auto w-full max-w-4xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">طلب شراء جديد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سيُولّد المعرف تلقائياً بصيغة [المصنع]-[القسم]-[تسلسل] مثل: LB-03-01C8
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/requisitions')}
          className="min-h-11 w-full sm:w-auto"
        >
          رجوع إلى الطلبات
        </Button>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
          <section aria-labelledby="requisition-participants-heading" className="space-y-3">
            <div>
              <h2 id="requisition-participants-heading" className="text-lg font-semibold">
                الجهة والقسم
              </h2>
              <p className="text-sm text-muted-foreground">اختر المصنع والقسم المرتبطين بالطلب.</p>
            </div>
            <Card>
              <CardContent className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="plantId"
                rules={{ required: 'يرجى اختيار المصنع' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
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
                            className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            الانتقال إلى صفحة العملاء
                          </button>
                        </div>
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="min-h-11 w-full text-sm">
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
                    <FormLabel>
                      القسم<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="min-h-11 w-full text-sm">
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
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="requisition-details-heading" className="space-y-3">
            <div>
              <h2 id="requisition-details-heading" className="text-lg font-semibold">
                تفاصيل الطلب
              </h2>
              <p className="text-sm text-muted-foreground">
                أدخل المراجع والتواريخ والعنوان والملاحظات المتاحة.
              </p>
            </div>
            <Card>
              <CardContent className="space-y-5 p-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="externalRef"
                rules={{
                  required: 'يرجى إدخال المرجع الخارجي',
                  validate: (value) => Boolean(value.trim()) || 'يرجى إدخال المرجع الخارجي',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      المرجع الخارجي<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="مثال: SL75-2026"
                        dir="ltr"
                        className="min-h-11 text-sm text-start"
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
                    <FormLabel>تاريخ استلام الطلب</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            aria-label="اختيار تاريخ استلام الطلب"
                            className={cn(
                              'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dueDate"
                rules={{ required: 'يرجى تحديد تاريخ الاستحقاق' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      تاريخ الاستحقاق<RequiredMark />
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            aria-label="اختيار تاريخ الاستحقاق"
                            className={cn(
                              'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                rules={{
                  required: 'يرجى إدخال عنوان الطلب',
                  validate: (value) => Boolean(value.trim()) || 'يرجى إدخال عنوان الطلب',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      عنوان الطلب<RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="وصف مختصر للطلب، مثال: توريد قطع غيار مضخات الأسمنت"
                        className="min-h-11 text-sm"
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
                      <FormLabel>ملاحظات العميل</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="أي تفاصيل إضافية وردت من العميل (اختياري)"
                          className="min-h-28 text-sm"
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>اختياري — تظهر في تفاصيل الطلب وسجل التدقيق</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="requisition-attachments-heading" className="space-y-3">
            <div>
              <h2 id="requisition-attachments-heading" className="text-lg font-semibold">
                المرفقات
              </h2>
              <p className="text-sm text-muted-foreground">أضف الملفات الداعمة للطلب، إن وجدت.</p>
            </div>
            <Card>
              <CardContent className="space-y-4 p-5">
                <div
              {...dropzone.handlers}
              aria-label="منطقة إضافة المرفقات — اسحب الملفات وأفلتها هنا"
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
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
                className="min-h-11 rounded-md px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                إضافة ملفات
              </button>
              <p className="mt-1 text-sm text-muted-foreground">
                اسحب الملفات وأفلتها هنا أو اختر من جهازك
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                pdf, doc, docx, xls, xlsx, dwg, zip وغيرها — الحد الأقصى 10 م.ب للملف الواحد
              </p>
                </div>

            {pendingFiles.length > 0 && (
              <ul aria-label="الملفات المختارة" className="divide-y divide-border">
                {pendingFiles.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p dir="ltr" className="truncate text-sm font-medium text-start">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      disabled={submitting}
                      className="min-h-11 shrink-0 text-destructive hover:text-destructive"
                    >
                      إزالة
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {fileErrors.length > 0 && (
              <ul aria-live="polite" className="space-y-2">
                {fileErrors.map((error, index) => (
                  <li
                    key={index}
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            )}
              </CardContent>
            </Card>
          </section>

          {serverError && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full sm:w-auto sm:min-w-40"
            >
              {submitting ? 'جارٍ حفظ الطلب...' : 'حفظ الطلب'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requisitions')}
              disabled={submitting}
              className="min-h-11 w-full sm:w-auto"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}