import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '@/lib/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { USER_EDIT_FORM_TEXT } from '@/components/users/userEditFormConstants'
import { userEditSchema, type UserEditFormValues } from '@/components/users/userEditSchema'
import { ManagerAssignmentSelect } from '@/components/users/ManagerAssignmentSelect'

const USER_ROLES: UserRole[] = ['User', 'Manager', 'Admin']

export function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const userId = Number(id)
  const currentUser = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const { toast } = useToast()

  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isSelf = currentUser?.id === userId

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      role: 'User',
      active: true,
      managerId: '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })
  const { isSubmitting } = form.formState
  const role = form.watch('role')

  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const user = await api.users.detail(userId)
        if (cancelled) return
        setUsername(user.username)
        form.reset({
          role: user.role,
          active: user.isActive,
          managerId: user.managerId === null ? '' : String(user.managerId),
        })
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : USER_EDIT_FORM_TEXT.loadFailed,
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (Number.isInteger(userId) && userId > 0) {
      void loadUser()
    } else {
      setLoadError(USER_EDIT_FORM_TEXT.loadFailed)
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [form, userId])

  const handleSubmit = async (values: UserEditFormValues) => {
    setSubmitError(null)
    try {
      await updateUser(userId, {
        displayName: username,
        role: values.role,
        isActive: values.active,
        managerId: values.role === 'User' && values.managerId
          ? Number(values.managerId)
          : null,
      })
      toast({
        title: USER_EDIT_FORM_TEXT.saved,
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
      navigate('/users')
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : USER_EDIT_FORM_TEXT.saveFailed,
      )
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-[520px] space-y-6">
      <header className="space-y-3">
        <Link
          to="/users"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {USER_EDIT_FORM_TEXT.back}
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{USER_EDIT_FORM_TEXT.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{USER_EDIT_FORM_TEXT.subtitle}</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-7" aria-label="جارٍ تحميل بيانات المستخدم">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ) : loadError ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="space-y-5"
          >
            <Card className="shadow-none">
              <CardHeader className="space-y-1 p-5">
                <CardTitle className="text-sm font-black">{USER_EDIT_FORM_TEXT.identitySection}</CardTitle>
                <CardDescription className="text-xs">{USER_EDIT_FORM_TEXT.identityDescription}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="user-edit-username" className="text-sm font-bold text-foreground">
                    {USER_EDIT_FORM_TEXT.username}
                  </Label>
                  <Input
                    id="user-edit-username"
                    value={username}
                    dir="ltr"
                    disabled
                    autoComplete="username"
                    className="h-11 text-sm disabled:opacity-70"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="space-y-1 p-5">
                <CardTitle className="text-sm font-black">{USER_EDIT_FORM_TEXT.accessSection}</CardTitle>
                <CardDescription className="text-xs">{USER_EDIT_FORM_TEXT.accessDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 pt-0">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-bold text-foreground">
                        {USER_EDIT_FORM_TEXT.role}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={isSelf}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={fieldState.error ? 'user-role-error' : undefined}
                          className="gap-2"
                        >
                          {USER_ROLES.map((role) => (
                            <label
                              key={role}
                              className="flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-start transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-primary/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 motion-reduce:transition-none"
                            >
                              <RadioGroupItem value={role} className="mt-1" />
                              <span className="space-y-1">
                                <span className="block text-sm font-semibold">
                                  {USER_EDIT_FORM_TEXT.roles[role].label}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {USER_EDIT_FORM_TEXT.roles[role].description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage id="user-role-error" role="alert" className="text-xs" />
                    </FormItem>
                  )}
                />

                {role === 'User' && (
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <ManagerAssignmentSelect
                          value={field.value}
                          onChange={field.onChange}
                          copy={{
                            label: USER_EDIT_FORM_TEXT.manager,
                            placeholder: USER_EDIT_FORM_TEXT.managerPlaceholder,
                            loading: USER_EDIT_FORM_TEXT.managerLoading,
                            unassigned: USER_EDIT_FORM_TEXT.managerUnassigned,
                            hint: USER_EDIT_FORM_TEXT.managerHint,
                            loadFailed: USER_EDIT_FORM_TEXT.managerLoadFailed,
                            retry: USER_EDIT_FORM_TEXT.managerRetry,
                            noneAvailable: USER_EDIT_FORM_TEXT.managerNoneAvailable,
                          }}
                        />
                        <FormMessage role="alert" className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="space-y-2 border-t border-border pt-5">
                      <FormLabel className="text-sm font-bold text-foreground">
                        {USER_EDIT_FORM_TEXT.active}
                      </FormLabel>
                      <FormControl>
                        <div className="flex min-h-11 items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              {field.value
                                ? USER_EDIT_FORM_TEXT.activeOn
                                : USER_EDIT_FORM_TEXT.activeOff}
                            </p>
                            <FormDescription className="text-xs">
                              {USER_EDIT_FORM_TEXT.inactiveHint}
                            </FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={isSelf}
                            aria-label={USER_EDIT_FORM_TEXT.active}
                            className="shrink-0"
                          />
                        </div>
                      </FormControl>
                      <FormMessage role="alert" className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {submitError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {submitError}
              </p>
            )}

            {isSelf && (
              <p className="text-xs text-muted-foreground">
                لا يمكن تغيير دورك أو تعطيل حسابك من هنا.
              </p>
            )}

            <div className="flex flex-col gap-3 pt-1 min-[480px]:flex-row">
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="h-11 w-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 min-[480px]:w-auto min-[480px]:min-w-36"
              >
                {isSubmitting ? USER_EDIT_FORM_TEXT.saving : USER_EDIT_FORM_TEXT.save}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/users')}
                disabled={isSubmitting}
                className="h-11 w-full text-sm font-semibold min-[480px]:w-auto"
              >
                {USER_EDIT_FORM_TEXT.cancel}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </main>
  )
}
