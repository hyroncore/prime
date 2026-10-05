import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { CLIENT_FORM_TEXT } from './clientFormConstants'
import { clientSchema, type ClientFormValues } from './clientSchema'

export function ClientForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const clients = useAppStore((state) => state.clients)
  const fetchClients = useAppStore((state) => state.fetchClients)
  const createPlant = useAppStore((state) => state.createPlant)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      plantName: '',
      shortCode: '',
      clientId: '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })
  const { isSubmitting } = form.formState

  useEffect(() => {
    let cancelled = false
    fetchClients().catch((error: unknown) => {
      if (!cancelled) {
        setClientsError(
          error instanceof Error ? error.message : CLIENT_FORM_TEXT.loadClientsError,
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [fetchClients])

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      await createPlant({
        plantName: values.plantName,
        shortCode: values.shortCode.toUpperCase(),
        clientId: Number(values.clientId),
      })
      toast({
        title: CLIENT_FORM_TEXT.saved,
        className:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
      })
      navigate('/clients')
    } catch (error) {
      form.setError('shortCode', {
        type: 'server',
        message: error instanceof Error ? error.message : CLIENT_FORM_TEXT.createFailed,
      })
      form.setFocus('shortCode')
    }
  }

  return (
    <div className="mx-auto max-w-[520px] space-y-6">
      <header className="space-y-3">
        <Link
          to="/clients"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {CLIENT_FORM_TEXT.back}
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{CLIENT_FORM_TEXT.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{CLIENT_FORM_TEXT.subtitle}</p>
        </div>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
          className="space-y-7"
        >
          <FormField
            control={form.control}
            name="plantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">
                  {CLIENT_FORM_TEXT.name}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="organization"
                    placeholder={CLIENT_FORM_TEXT.namePlaceholder}
                    className="h-11 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </FormControl>
                <FormMessage role="alert" className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">
                  {CLIENT_FORM_TEXT.shortCode}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    dir="ltr"
                    autoCapitalize="characters"
                    placeholder={CLIENT_FORM_TEXT.shortCodePlaceholder}
                    className="h-11 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </FormControl>
                <FormMessage role="alert" className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">
                  {CLIENT_FORM_TEXT.linkedClient}
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={clients.length === 0}
                >
                  <FormControl>
                    <SelectTrigger
                      onBlur={field.onBlur}
                      className="h-11 w-full focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <SelectValue placeholder={CLIENT_FORM_TEXT.linkedClientPlaceholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && !clientsError && (
                  <FormDescription className="text-xs">
                    <Link to="/settings" className="text-primary underline underline-offset-4">
                      {CLIENT_FORM_TEXT.noClients}
                    </Link>
                  </FormDescription>
                )}
                {clientsError && (
                  <p role="alert" className="text-xs text-destructive">{clientsError}</p>
                )}
                <FormMessage role="alert" className="text-xs" />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 pt-1 min-[480px]:flex-row">
            <Button
              type="submit"
              disabled={isSubmitting || clients.length === 0}
              aria-busy={isSubmitting}
              className="h-11 w-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 min-[480px]:w-auto min-[480px]:min-w-36"
            >
              {isSubmitting ? CLIENT_FORM_TEXT.saving : CLIENT_FORM_TEXT.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/clients')}
              disabled={isSubmitting}
              className="h-11 w-full text-sm font-semibold min-[480px]:w-auto"
            >
              {CLIENT_FORM_TEXT.cancel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
