export type TabKey = 'review' | 'internal' | 'archive';

export type TabConfig = {
  key: TabKey;
  label: string;
  statuses: string[];
  actions: WorkflowActionType[];
};

export type WorkflowActionType = 
  | 'approve-review' 
  | 'decline-review' 
  | 'approve-manager-review'
  | 'approve-internal' 
  | 'request-revision';

export interface WorkflowFilters {
  search: string;
  plantId: number | null;
  sectorCode: string | null;
  from: string | null;
  to: string | null;
}

export interface WorkflowCounts {
  review: number;
  internal: number;
  archive: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const TABS: TabConfig[] = [
  {
    key: 'review',
    label: 'مراجعة المدير',
    statuses: ['REVIEW', 'MANAGER_REVIEW'],
    actions: ['approve-review', 'decline-review', 'approve-manager-review', 'request-revision'],
  },
  {
    key: 'internal',
    label: 'اعتماد داخلي',
    statuses: ['INTERNAL_APPROVAL'],
    actions: ['approve-internal', 'request-revision'],
  },
  {
    key: 'archive',
    label: 'الأرشيف',
    statuses: ['DECLINED', 'SUBMITTED', 'WON', 'LOST'],
    actions: [],
  },
];

export const ACTION_LABELS: Record<WorkflowActionType, { label: string; variant: 'default' | 'destructive' | 'outline' }> = {
  'approve-review': { label: 'موافقة', variant: 'default' },
  'decline-review': { label: 'رفض', variant: 'destructive' },
  'approve-manager-review': { label: 'قبول المراجعة', variant: 'default' },
  'approve-internal': { label: 'اعتماد', variant: 'default' },
  'request-revision': { label: 'طلب تعديل', variant: 'outline' },
};

export const EMPTY_MESSAGES: Record<TabKey, string> = {
  review: 'لا توجد طلبات بانتظار مراجعتك',
  internal: 'لا توجد طلبات بانتظار الاعتماد الداخلي',
  archive: 'لا توجد طلبات في الأرشيف',
};