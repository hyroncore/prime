import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, toDateKey } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'
import type { WorkflowFilters as WorkflowFilterValues } from './workflowTypes'

interface WorkflowFiltersProps {
  values: WorkflowFilterValues
  onChange: (values: Partial<WorkflowFilterValues>) => void
  onClear: () => void
}

const ALL_VALUE = 'all'

function parseDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : undefined
}

export function WorkflowFilters({ values, onChange, onClear }: WorkflowFiltersProps) {
  const plants = useAppStore((state) => state.plants)
  const sectors = useAppStore((state) => state.sectors)
  const hasFilters = Object.values(values).some((value) => value !== null && value !== '')
  const fromDate = parseDate(values.from)
  const toDate = parseDate(values.to)

  return (
    <Card className="shadow-none">
      <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
          <Label htmlFor="workflow-search" className="text-xs font-bold">
            البحث
          </Label>
          <Input
            id="workflow-search"
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="المعرف أو المرجع أو العنوان..."
            className="h-11 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workflow-plant" className="text-xs font-bold">
            المصنع
          </Label>
          <Select
            value={values.plantId ? String(values.plantId) : ALL_VALUE}
            onValueChange={(value) =>
              onChange({ plantId: value === ALL_VALUE ? null : Number(value) })
            }
          >
            <SelectTrigger id="workflow-plant" className="h-11 w-full text-sm">
              <SelectValue placeholder="كل المصانع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>كل المصانع</SelectItem>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={String(plant.id)}>
                  {plant.plantName} [{plant.shortCode}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workflow-sector" className="text-xs font-bold">
            القسم
          </Label>
          <Select
            value={values.sectorCode ?? ALL_VALUE}
            onValueChange={(value) =>
              onChange({ sectorCode: value === ALL_VALUE ? null : value })
            }
          >
            <SelectTrigger id="workflow-sector" className="h-11 w-full text-sm">
              <SelectValue placeholder="كل الأقسام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>كل الأقسام</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector.code} value={sector.code}>
                  {sector.code} — {sector.nameArabic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-5 xl:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="workflow-received-from" className="text-xs font-bold">
              تاريخ الاستلام من
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  id="workflow-received-from"
                  aria-label={`تاريخ الاستلام من: ${values.from ? formatDate(values.from) : 'اختر تاريخاً'}`}
                  className="h-11 w-full justify-start text-start text-sm font-normal"
                >
                  {values.from ? formatDate(values.from) : 'اختر تاريخاً'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseDate(values.from)}
                  onSelect={(date) => onChange({ from: date ? toDateKey(date) : null })}
                  disabled={(date) => Boolean(toDate && date > toDate)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workflow-received-to" className="text-xs font-bold">
              تاريخ الاستلام إلى
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  id="workflow-received-to"
                  aria-label={`تاريخ الاستلام إلى: ${values.to ? formatDate(values.to) : 'اختر تاريخاً'}`}
                  className="h-11 w-full justify-start text-start text-sm font-normal"
                >
                  {values.to ? formatDate(values.to) : 'اختر تاريخاً'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseDate(values.to)}
                  onSelect={(date) => onChange({ to: date ? toDateKey(date) : null })}
                  disabled={(date) => Boolean(fromDate && date < fromDate)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {hasFilters && (
            <div className="col-span-2 flex items-end xl:col-span-1">
              <Button
                type="button"
                variant="ghost"
                onClick={onClear}
                className="h-11 w-full text-sm font-semibold text-muted-foreground"
              >
                مسح عوامل التصفية
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
