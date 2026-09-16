import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { WorkflowActionType, ACTION_LABELS } from './workflowTypes';

interface WorkflowActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  actionType: WorkflowActionType;
}

export function WorkflowActionDialog({ open, onClose, onConfirm, actionType }: WorkflowActionDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { label, variant } = ACTION_LABELS[actionType];
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!notes.trim()) {
      setError('الملاحظات مطلوبة');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(notes.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الإجراء');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-black">{label} الطلب</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            يرجى كتابة ملاحظات الإجراء (مطلوبة لسجل التدقيق)
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب الملاحظات هنا..."
            className="min-h-[80px] text-sm"
            maxLength={1000}
          />
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row-reverse">
          <Button
            onClick={handleConfirm}
            disabled={busy || !notes.trim()}
            variant={variant}
            className="w-full sm:w-auto"
          >
            {busy ? 'جارٍ الحفظ...' : label}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
            إلغاء
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}