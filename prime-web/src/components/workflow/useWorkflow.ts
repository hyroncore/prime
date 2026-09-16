import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import type { RequisitionDto } from '@/lib/types';
import { TabKey, WorkflowFilters, WorkflowCounts } from './workflowTypes';

interface UseWorkflowReturn {
  items: RequisitionDto[];
  counts: WorkflowCounts;
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  activeTab: TabKey;
  filters: WorkflowFilters;
  setActiveTab: (tab: TabKey) => void;
  setFilters: (filters: Partial<WorkflowFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  approveReview: (id: number, notes: string) => Promise<void>;
  declineReview: (id: number, notes: string) => Promise<void>;
  approveInternal: (id: number, notes: string) => Promise<void>;
  requestRevision: (id: number, notes: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTERS: WorkflowFilters = {
  search: '',
  plantId: null,
  sectorCode: null,
  from: null,
  to: null,
};

export function useWorkflow(): UseWorkflowReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [items, setItems] = useState<RequisitionDto[]>([]);
  const [counts, setCounts] = useState<WorkflowCounts>({ review: 0, internal: 0, archive: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('review');
  const [filters, setFilters] = useState<WorkflowFilters>(DEFAULT_FILTERS);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    
    const statuses: string[] = [];
    if (activeTab === 'review') statuses.push('REVIEW');
    else if (activeTab === 'internal') statuses.push('SUBMITTED');
    else if (activeTab === 'archive') statuses.push('DECLINED', 'APPROVED', 'REVISE');
    
    params.set('status', statuses.join(','));
    
    if (filters.search) params.set('search', filters.search);
    if (filters.plantId) params.set('plantId', String(filters.plantId));
    if (filters.sectorCode) params.set('sectorCode', filters.sectorCode);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    
    return params.toString();
  }, [activeTab, filters, page, pageSize]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      buildQuery();
      // API doesn't support pagination yet, fetch all and slice client-side
      const response = await api.requisitions.list({ 
        search: filters.search || undefined,
        plantId: filters.plantId ?? undefined,
        sectorCode: filters.sectorCode ?? undefined,
        status: activeTab === 'review' ? 'REVIEW' : activeTab === 'internal' ? 'SUBMITTED' : 'DECLINED,APPROVED,REVISE',
      });
      
      const allItems = response as RequisitionDto[];
      setTotal(allItems.length);
      const start = (page - 1) * pageSize;
      setItems(allItems.slice(start, start + pageSize));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل البيانات');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, filters]);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await api.dashboard.workflowCounts();
      setCounts(data);
    } catch {
      // Silent fail for counts
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchList(), fetchCounts()]);
    try {
      await Promise.all([
        useAppStore.getState().fetchRequisitions(),
        useAppStore.getState().fetchStats(),
      ]);
    } catch {
      // ignore
    }
  }, [fetchList, fetchCounts]);

  // Initialize from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey | null;
    if (tab && ['review', 'internal', 'archive'].includes(tab)) {
      setActiveTab(tab);
    }
    
    const plantId = searchParams.get('plantId');
    const sectorCode = searchParams.get('sectorCode');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const p = searchParams.get('page');
    const ps = searchParams.get('pageSize');
    
    if (plantId) setFilters((f) => ({ ...f, plantId: Number(plantId) }));
    if (sectorCode) setFilters((f) => ({ ...f, sectorCode }));
    if (from) setFilters((f) => ({ ...f, from }));
    if (to) setFilters((f) => ({ ...f, to }));
    if (search) setFilters((f) => ({ ...f, search }));
    if (p) setPage(Number(p));
    if (ps) setPageSize(Number(ps));
  }, [searchParams]);

  // Fetch when dependencies change
  useEffect(() => {
    void fetchList();
    void fetchCounts();
  }, [fetchList, fetchCounts]);

  const handleSetActiveTab = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
    setSearchParams({ ...Object.fromEntries(searchParams), tab, page: '1' }, { replace: true });
  };

  const handleSetFilters = (patch: Partial<WorkflowFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    const params = { tab: activeTab };
    setSearchParams(params, { replace: true });
  };

  const handleSetPage = (p: number) => {
    setPage(p);
    setSearchParams({ ...Object.fromEntries(searchParams), page: String(p) }, { replace: true });
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
    setSearchParams({ ...Object.fromEntries(searchParams), pageSize: String(size), page: '1' }, { replace: true });
  };

  const actionToast = (title: string) =>
    toast({
      title,
      className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    });

  const handleApproveReview = async (id: number, notes: string) => {
    await api.requisitions.updateStatus(id, 'PROCESSING', notes);
    actionToast('تمت الموافقة على المراجعة');
    await refresh();
  };

  const handleDeclineReview = async (id: number, notes: string) => {
    await api.requisitions.updateStatus(id, 'DECLINED', notes);
    actionToast('تم رفض المراجعة');
    await refresh();
  };

  const handleApproveInternal = async (id: number, notes: string) => {
    await api.requisitions.updateStatus(id, 'APPROVED', notes);
    actionToast('تم الاعتماد الداخلي');
    await refresh();
  };

  const handleRequestRevision = async (id: number, notes: string) => {
    await api.requisitions.updateStatus(id, 'REVISE', notes);
    actionToast('تم طلب التعديل');
    await refresh();
  };

  return {
    items,
    counts,
    total,
    page,
    pageSize,
    loading,
    error,
    activeTab,
    filters,
    setActiveTab: handleSetActiveTab,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    approveReview: handleApproveReview,
    declineReview: handleDeclineReview,
    approveInternal: handleApproveInternal,
    requestRevision: handleRequestRevision,
    refresh,
  };
}