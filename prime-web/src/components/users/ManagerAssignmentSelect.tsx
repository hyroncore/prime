import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { UserDto } from '@/lib/types'

interface ManagerAssignmentCopy {
  label: string
  placeholder: string
  loading: string
  unassigned: string
  hint: string
  loadFailed: string
  retry: string
  noneAvailable: string
}

interface ManagerAssignmentSelectProps {
  value: string
  onChange: (value: string) => void
  copy: ManagerAssignmentCopy
}

export function ManagerAssignmentSelect({
  value,
  onChange,
  copy,
}: ManagerAssignmentSelectProps) {
  const [managers, setManagers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadManagers = async () => {
      setLoading(true)
      setError(null)
      try {
        const users = await api.users.list()
        if (!cancelled) {
          setManagers(users.filter((user) => user.role === 'Manager' && user.isActive))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : copy.loadFailed)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadManagers()
    return () => {
      cancelled = true
    }
  }, [copy.loadFailed, retryCount])

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">{copy.label}</p>
      <Select
        value={value || 'unassigned'}
        onValueChange={(nextValue) =>
          onChange(nextValue === 'unassigned' ? '' : nextValue)
        }
        disabled={loading || Boolean(error)}
      >
        <SelectTrigger className="h-11 text-sm" aria-label={copy.placeholder}>
          <SelectValue placeholder={loading ? copy.loading : copy.placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">{copy.unassigned}</SelectItem>
          {managers.map((manager) => (
            <SelectItem key={manager.id} value={String(manager.id)}>
              {manager.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-destructive">
          <span role="alert">{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRetryCount((count) => count + 1)}
            className="h-9"
          >
            {copy.retry}
          </Button>
        </div>
      ) : !loading && managers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{copy.noneAvailable}</p>
      ) : null}
      {!error && <p className="text-xs text-muted-foreground">{copy.hint}</p>}
    </div>
  )
}
