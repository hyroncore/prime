import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { USER_FORM_TEXT } from './userFormConstants'
import { userSchema, type UserFormValues } from './userSchema'

export function UserForm({ onCancel }: { onCancel: () => void }) {
  const createUser = useAppStore((state) => state.createUser)
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'standard',
      active: true,
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })
  const { isSubmitting } = form.formState
  const password = form.watch('password')

  const handleSubmit = async (values: UserFormValues) => {
    try {
      await createUser(values)
      toast({
        title: USER_FORM_TEXT.saved,
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
      onCancel()
    } catch (error) {
      form.setError('username', {
        type: 'server',
        message: error instanceof Error ? error.message : USER_FORM_TEXT.createFailed,
      })
      form.setFocus('username')
    }
  }

  const passwordChecks = [
    { key: 'length', passed: password.length >= 8 },
    { key: 'letter', passed: /[A-Za-z]/.test(password) },
    { key: 'number', passed: /[0-9]/.test(password) },
  ] as const

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
        className="space-y-5"
      >
        <Card className="shadow-none">
          <CardHeader className="space-y-1 p-5">
            <CardTitle className="text-sm font-black">{USER_FORM_TEXT.credentialsSection}</CardTitle>
            <CardDescription className="text-xs">{USER_FORM_TEXT.credentialsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5 pt-0">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-bold text-foreground">
                    {USER_FORM_TEXT.username}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      dir="ltr"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={USER_FORM_TEXT.usernamePlaceholder}
                      className="h-11 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {USER_FORM_TEXT.usernameHint}
                  </FormDescription>
                  <FormMessage role="alert" className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-bold text-foreground">
                    {USER_FORM_TEXT.password}
                  </FormLabel>
                  <div className="relative" dir="rtl">
                    <FormControl>
                      <Input
                        {...field}
                        dir="ltr"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        aria-describedby={
                          fieldState.error
                            ? 'password-hint password-error'
                            : 'password-hint'
                        }
                        aria-invalid={fieldState.invalid}
                        placeholder={USER_FORM_TEXT.passwordPlaceholder}
                        className="h-11 pe-24 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={
                        showPassword ? USER_FORM_TEXT.hidePassword : USER_FORM_TEXT.showPassword
                      }
                      className="absolute inset-y-0 end-2 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {showPassword ? USER_FORM_TEXT.hidePassword : USER_FORM_TEXT.showPassword}
                    </button>
                  </div>
                  <FormDescription id="password-hint" className="text-xs">
                    {USER_FORM_TEXT.passwordHint}
                  </FormDescription>
                  <ul
                    className="space-y-1 text-xs"
                    aria-label={USER_FORM_TEXT.passwordHint}
                    aria-live="polite"
                  >
                    {passwordChecks.map(({ key, passed }) => (
                      <li
                        key={key}
                        className={passed ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                      >
                        {passed
                          ? USER_FORM_TEXT.checklistMet
                          : USER_FORM_TEXT.checklistNeeded}
                        {USER_FORM_TEXT.passwordChecks[key]}
                      </li>
                    ))}
                  </ul>
                  <FormMessage id="password-error" role="alert" className="text-xs" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="space-y-1 p-5">
            <CardTitle className="text-sm font-black">{USER_FORM_TEXT.accessSection}</CardTitle>
            <CardDescription className="text-xs">{USER_FORM_TEXT.accessDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5 pt-0">
            <FormField
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-bold text-foreground">
                    {USER_FORM_TEXT.role}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.error ? 'role-error' : undefined}
                      className="gap-2"
                    >
                      {(['standard', 'admin', 'system_manager'] as const).map((role) => {
                        const option = USER_FORM_TEXT.roles[role]
                        const id = `role-${role}`
                        return (
                          <label
                            key={role}
                            htmlFor={id}
                            className="flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-input p-3 text-start transition-colors hover:bg-muted/40 focus-within:ring-2 focus-within:ring-primary/40"
                          >
                            <RadioGroupItem id={id} value={role} className="mt-1" />
                            <span className="space-y-1">
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span className="block text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage id="role-error" role="alert" className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="space-y-2 border-t border-border pt-5">
                  <FormLabel className="text-sm font-bold text-foreground">
                    {USER_FORM_TEXT.active}
                  </FormLabel>
                  <FormControl>
                    <div className="flex min-h-11 items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {field.value ? USER_FORM_TEXT.activeOn : USER_FORM_TEXT.activeOff}
                        </p>
                        <FormDescription className="text-xs">
                          {USER_FORM_TEXT.inactiveHint}
                        </FormDescription>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        onBlur={field.onBlur}
                        aria-label={USER_FORM_TEXT.active}
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

        <div className="flex flex-col gap-3 pt-1 min-[480px]:flex-row">
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold min-[480px]:w-auto min-[480px]:min-w-36"
          >
            {isSubmitting ? USER_FORM_TEXT.saving : USER_FORM_TEXT.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 w-full text-sm font-semibold min-[480px]:w-auto"
          >
            {USER_FORM_TEXT.cancel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
