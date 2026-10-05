import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WorkflowPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function WorkflowPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: WorkflowPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        عرض {start}–{end} من إجمالي {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="workflow-page-size" className="text-xs text-muted-foreground">
          لكل صفحة
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger id="workflow-page-size" className="h-11 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[25, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-11"
        >
          السابق
        </Button>
        <span className="min-w-20 text-center text-xs text-muted-foreground" aria-live="polite">
          صفحة {page} من {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-11"
        >
          التالي
        </Button>
      </div>
    </div>
  )
}
