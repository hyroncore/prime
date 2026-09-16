import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, toDateKey } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import type { WorkflowFilters } from './workflowTypes';

interface WorkflowFiltersProps {
  values: WorkflowFilters;
  onChange: (values: Partial<WorkflowFilters>) => void;
  onClear: () => void;
}

export function WorkflowFilters({ values, onChange, onClear }: WorkflowFiltersProps) {
  const plants = useAppStore((s) => s.plants);
  const sectors = useAppStore((s) => s.sectors);
  const [searchParams, setSearchParams] = useSearchParams();

  const syncToUrl = (patch: Partial<WorkflowFilters>) => {
    const next = { ...values, ...patch };
    const params: Record<string, string> = {};
    if (next.search) params.search = next.search;
    if (next.plantId) params.plantId = String(next.plantId);
    if (next.sectorCode) params.sectorCode = next.sectorCode;
    if (next.from) params.from = next.from;
    if (next.to) params.to = next.to;
    setSearchParams({ ...Object.fromEntries(searchParams), ...params }, { replace: true });
    onChange(patch);
  };

  const handleClear = () => {
    setSearchParams({ tab: searchParams.get('tab') ?? 'review' }, { replace: true });
    onClear();
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="بحث بالمعرف، العنوان، العميل..."
          value={values.search}
          onChange={(e) => syncToUrl({ search: e.target.value })}
          className="h-9 text-sm"
        />
      </div>

      <div className="w-48">
        <Select value={values.plantId ? String(values.plantId) : ''} onValueChange={(v) => syncToUrl({ plantId: v ? Number(v) : null })}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="المصنع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">الكل</SelectItem>
            {plants.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.plantName} [{p.shortCode}]</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <Select value={values.sectorCode ?? ''} onValueChange={(v) => syncToUrl({ sectorCode: v || null })}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">الكل</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">من</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-32 text-sm justify-start text-left"
            >
              {values.from ? formatDate(values.from) : 'تاريخ من'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={values.from ? new Date(values.from) : undefined}
              onSelect={(d) => syncToUrl({ from: d ? toDateKey(d) : null })}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">إلى</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-32 text-sm justify-start text-left"
            >
              {values.to ? formatDate(values.to) : 'تاريخ إلى'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={values.to ? new Date(values.to) : undefined}
              onSelect={(d) => syncToUrl({ to: d ? toDateKey(d) : null })}
            />
          </PopoverContent>
        </Popover>
      </div>

      {Object.values(values).some((v) => v != null && v !== '') && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-600 hover:text-red-700">
          مسح التصفية
        </Button>
      )}
    </div>
  );
}