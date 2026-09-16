import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkflowPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function WorkflowPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: WorkflowPaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <span className="text-xs text-muted-foreground">
        عرض {start} - {end} من إجمالي {total}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 text-sm border border-input bg-background rounded px-2"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn('text-xs', page <= 1 && 'opacity-30 cursor-not-allowed')}
        >
          السابق
        </Button>
        <span className="text-xs text-muted-foreground w-20 text-center">
          صفحة {page} من {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn('text-xs', page >= totalPages && 'opacity-30 cursor-not-allowed')}
        >
          التالي
        </Button>
      </div>
    </div>
  );
}