import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { RequisitionDto } from '@/lib/types'
import type { TabKey, WorkflowCounts, WorkflowFilters } from './workflowTypes'

interface UseWorkflowReturn {
  items: RequisitionDto[]
  counts: WorkflowCounts | null
  countsError: string | null
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  activeTab: TabKey
  filters: WorkflowFilters
  setActiveTab: (tab: TabKey) => void
  setFilters: (filters: Partial<WorkflowFilters>) => void
  clearFilters: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  approveReview: (id: number, notes: string) => Promise<void>
  declineReview: (id: number, notes: string) => Promise<void>
  approveManagerReview: (id: number, notes: string) => Promise<void>
  approveInternal: (id: number, notes: string) => Promise<void>
  requestRevision: (id: number, notes: string) => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_FILTERS: WorkflowFilters = {
  search: '',
  plantId: null,
  sectorCode: null,
  from: null,
  to: null,
}

const PAGE_SIZES = [25, 50, 100]

function readTab(value: string | null): TabKey {
  return value === 'internal' || value === 'archive' ? value : 'review'
}

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function readFilters(params: URLSearchParams): WorkflowFilters {
  const plantId = Number(params.get('plantId'))
  return {
    search: params.get('search') ?? '',
    plantId: Number.isInteger(plantId) && plantId > 0 ? plantId : null,
    sectorCode: params.get('sectorCode') || null,
    from: params.get('from') || null,
    to: params.get('to') || null,
  }
}

export function useWorkflow(): UseWorkflowReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const initialParams = useRef(searchParams)
  const [items, setItems] = useState<RequisitionDto[]>([])
  const [counts, setCounts] = useState<WorkflowCounts | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(() =>
    readPositiveInteger(initialParams.current.get('page'), 1),
  )
  const [pageSize, setPageSize] = useState(() => {
    const size = readPositiveInteger(initialParams.current.get('pageSize'), 50)
    return PAGE_SIZES.includes(size) ? size : 50
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    readTab(initialParams.current.get('tab')),
  )
  const [filters, setFilters] = useState<WorkflowFilters>(() =>
    readFilters(initialParams.current),
  )
  const listSequence = useRef(0)
  const countSequence = useRef(0)

  const writeUrl = useCallback(
    (
      tab: TabKey,
      nextFilters: WorkflowFilters,
      nextPage: number,
      nextPageSize: number,
    ) => {
      const params = new URLSearchParams()
      params.set('tab', tab)
      params.set('page', String(nextPage))
      params.set('pageSize', String(nextPageSize))
      if (nextFilters.search) params.set('search', nextFilters.search)
      if (nextFilters.plantId) params.set('plantId', String(nextFilters.plantId))
      if (nextFilters.sectorCode) params.set('sectorCode', nextFilters.sectorCode)
      if (nextFilters.from) params.set('from', nextFilters.from)
      if (nextFilters.to) params.set('to', nextFilters.to)
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  const fetchList = useCallback(async () => {
    const sequence = ++listSequence.current
    setLoading(true)
    setError(null)
    try {
      const response = await api.requisitions.list({
        search: filters.search.trim() || undefined,
        plantId: filters.plantId ?? undefined,
        sectorCode: filters.sectorCode ?? undefined,
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
        status:
          activeTab === 'review'
            ? 'REVIEW,MANAGER_REVIEW'
            : activeTab === 'internal'
              ? 'INTERNAL_APPROVAL'
              : 'DECLINED,SUBMITTED,WON,LOST',
        page,
        pageSize,
      })
      if (sequence !== listSequence.current) return
      setTotal(response.totalCount)
      setItems(response.items)
      const totalPages = Math.max(1, Math.ceil(response.totalCount / pageSize))
      if (page > totalPages) {
        setPage(totalPages)
        writeUrl(activeTab, filters, totalPages, pageSize)
      }
    } catch (fetchError) {
      if (sequence !== listSequence.current) return
      setError(fetchError instanceof Error ? fetchError.message : 'تعذر تحميل الطلبات.')
      setItems([])
      setTotal(0)
    } finally {
      if (sequence === listSequence.current) setLoading(false)
    }
  }, [activeTab, filters, page, pageSize, writeUrl])

  const fetchCounts = useCallback(async () => {
    const sequence = ++countSequence.current
    try {
      const data = await api.dashboard.workflowCounts()
      if (sequence !== countSequence.current) return
      setCounts(data)
      setCountsError(null)
    } catch (fetchError) {
      if (sequence !== countSequence.current) return
      setCountsError(
        fetchError instanceof Error ? fetchError.message : 'تعذر تحميل أعداد الطلبات.',
      )
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchList(), fetchCounts()])
  }, [fetchCounts, fetchList])

  useEffect(() => {
    const nextTab = readTab(searchParams.get('tab'))
    const nextFilters = readFilters(searchParams)
    const nextPage = readPositiveInteger(searchParams.get('page'), 1)
    const requestedPageSize = readPositiveInteger(searchParams.get('pageSize'), 50)
    const nextPageSize = PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 50

    setActiveTab(nextTab)
    setFilters(nextFilters)
    setPage(nextPage)
    setPageSize(nextPageSize)
  }, [searchParams])

  useEffect(() => {
    void fetchList()
    return () => {
      listSequence.current += 1
    }
  }, [fetchList])

  useEffect(() => {
    void fetchCounts()
    return () => {
      countSequence.current += 1
    }
  }, [fetchCounts])

  const handleSetActiveTab = (tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
    writeUrl(tab, filters, 1, pageSize)
  }

  const handleSetFilters = (patch: Partial<WorkflowFilters>) => {
    const nextFilters = { ...filters, ...patch }
    setFilters(nextFilters)
    setPage(1)
    writeUrl(activeTab, nextFilters, 1, pageSize)
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
    writeUrl(activeTab, DEFAULT_FILTERS, 1, pageSize)
  }

  const handleSetPage = (nextPage: number) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(Math.max(nextPage, 1), totalPages)
    setPage(safePage)
    writeUrl(activeTab, filters, safePage, pageSize)
  }

  const handleSetPageSize = (size: number) => {
    if (!PAGE_SIZES.includes(size)) return
    setPageSize(size)
    setPage(1)
    writeUrl(activeTab, filters, 1, size)
  }

  const actionToast = (title: string) =>
    toast({
      title,
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    })

  const handleApproveReview = async (id: number, notes: string) => {
    await api.requisitions.workflow.approveReview(id, notes)
    actionToast('تمت الموافقة على المراجعة')
    await refresh()
  }

  const handleDeclineReview = async (id: number, notes: string) => {
    await api.requisitions.workflow.declineReview(id, notes)
    actionToast('تم رفض المراجعة')
    await refresh()
  }

  const handleApproveManagerReview = async (id: number, notes: string) => {
    await api.requisitions.workflow.managerReview(id, 'approve', notes)
    actionToast('تم قبول مراجعة إنجاز العمل')
    await refresh()
  }

  const handleApproveInternal = async (id: number, notes: string) => {
    await api.requisitions.workflow.approveInternal(id, notes)
    actionToast('تم الاعتماد الداخلي')
    await refresh()
  }

  const handleRequestRevision = async (id: number, notes: string) => {
    await api.requisitions.workflow.requestRevision(id, notes)
    actionToast('تم طلب التعديل')
    await refresh()
  }

  return {
    items,
    counts,
    countsError,
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
    approveManagerReview: handleApproveManagerReview,
    approveInternal: handleApproveInternal,
    requestRevision: handleRequestRevision,
    refresh,
  }
}
