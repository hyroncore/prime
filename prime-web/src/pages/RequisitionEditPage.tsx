import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useArrowFieldNavigation } from '@/hooks/useArrowFieldNavigation'
import { api } from '@/lib/api'
import { toDateKey } from '@/lib/format'
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

export function RequisitionEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requisitionId = Number(id)

  const plants = useAppStore((s) => s.plants)
  const sectors = useAppStore((s) => s.sectors)
  const updateRequisition = useAppStore((s) => s.updateRequisition)

  const { toast } = useToast()

  const successToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useArrowFieldNavigation(formRef)

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

  useEffect(() => {
    if (!Number.isFinite(requisitionId)) {
      setLoadError('طلب غير صالح')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    api.requisitions
      .detail(requisitionId)
      .then((requisition) => {
        form.reset({
          plantId: String(requisition.plantId),
          sectorCode: requisition.sectorCode,
          externalRef: requisition.externalRef,
          title: requisition.title,
          dueDate: new Date(requisition.dueDate),
          receivedAt: new Date(requisition.receivedAt),
          clientNotes: requisition.clientNotes ?? '',
        })
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الطلب'))
      .finally(() => setLoading(false))
  }, [requisitionId, form])

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await updateRequisition(requisitionId, {
        externalRef: values.externalRef.trim(),
        plantId: Number(values.plantId),
        sectorCode: values.sectorCode,
        title: values.title.trim(),
        dueDate: values.dueDate ? toDateKey(values.dueDate) : toDateKey(new Date()),
        receivedAt: toDateKey(values.receivedAt),
        clientNotes: values.clientNotes.trim() || null,
      })
      successToast('تم تعديل الطلب بنجاح')
      navigate(`/requisitions/${requisitionId}`)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'حدث خطأ أثناء تعديل الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => navigate('/requisitions')}
          className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          رجوع إلى قائمة الطلبات ←
        </button>
        <div className="py-16 text-center">
          <p className="text-sm font-black">{loadError}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            قد يكون الطلب محذوفاً أو أن الرابط غير صحيح
          </p>
          <Button
            onClick={() => navigate('/requisitions')}
            className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
          >
            العودة لقائمة الطلبات
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">تعديل الطلب</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">عدّل بيانات الطلب — المعرف يبقى كما هو</p>
        </div>
        <button
          onClick={() => navigate(`/requisitions/${requisitionId}`)}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    </FormControl>
                    <FormDescription>المصنع التابع للجهة المعنية بالطلب</FormDescription>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              {submitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
            <button
              type="button"
              onClick={() => navigate(`/requisitions/${requisitionId}`)}
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