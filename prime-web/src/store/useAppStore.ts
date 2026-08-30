import { create } from 'zustand'
import { api } from '@/lib/api'
import { SECTORS } from '@/lib/format'
import type {
  AdminDashboardStatsDto,
  ClientDto,
  DashboardStatsDto,
  ManagerDashboardStatsDto,
  NotificationDto,
  PermissionMatrixDto,
  PlantDetailDto,
  RequisitionDto,
  RequisitionStatsDto,
  SectorDto,
  UserDashboardStatsDto,
} from '@/lib/types'

interface RequisitionFilters {
  search: string
  plantId: number | null
  sectorCode: string | null
  status: string | null
}

interface AppState {
  loading: boolean
  error: string | null

  stats: DashboardStatsDto | null
  kpiStats: RequisitionStatsDto | null
  userStats: UserDashboardStatsDto | null
  managerStats: ManagerDashboardStatsDto | null
  adminStats: AdminDashboardStatsDto | null
  permissionMatrix: PermissionMatrixDto | null
  requisitions: RequisitionDto[]
  clients: ClientDto[]
  plants: PlantDetailDto[]
  sectors: SectorDto[]

  activeRequisition: RequisitionDto | null
  drawerOpen: boolean
  clientDialogOpen: boolean
  plantDialogOpen: boolean
  editingPlant: PlantDetailDto | null
  editingClient: ClientDto | null

  filters: RequisitionFilters

  notifications: NotificationDto[]
  notificationUnread: number
  fetchNotifications: () => Promise<void>
  markNotificationRead: (id: number) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  fetchAll: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchRequisitions: () => Promise<void>
  fetchClients: () => Promise<void>
  fetchPlants: () => Promise<void>
  fetchSectors: () => Promise<void>

  openDrawer: (id: number) => Promise<void>
  closeDrawer: () => void
  openClientDialog: () => void
  closeClientDialog: () => void
  openPlantDialog: (plant?: PlantDetailDto) => void
  closePlantDialog: () => void
  openClientEditDialog: (client: ClientDto) => void

  setFilter: (patch: Partial<RequisitionFilters>) => void
  resetFilters: () => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setUserStats: (stats: UserDashboardStatsDto) => void
  setManagerStats: (stats: ManagerDashboardStatsDto) => void
  setAdminStats: (stats: AdminDashboardStatsDto) => void
  setPermissionMatrix: (matrix: PermissionMatrixDto) => void

  createRequisition: (body: Parameters<typeof api.requisitions.create>[0]) => Promise<RequisitionDto>
  updateRequisition: (id: number, body: Parameters<typeof api.requisitions.update>[1]) => Promise<void>
  deleteRequisition: (id: number) => Promise<void>
  updateRequisitionStatus: (id: number, status: string, notes: string) => Promise<RequisitionDto>
  uploadAttachment: (id: number, file: File) => Promise<void>
  deleteAttachment: (id: number) => Promise<void>
  createClient: (body: Parameters<typeof api.clients.create>[0]) => Promise<ClientDto>
  updateClient: (id: number, body: Parameters<typeof api.clients.update>[1]) => Promise<void>
  deleteClient: (id: number) => Promise<void>
  createPlant: (body: Parameters<typeof api.plants.create>[0]) => Promise<PlantDetailDto>
  updatePlant: (id: number, body: Parameters<typeof api.plants.update>[1]) => Promise<void>
  deletePlant: (id: number) => Promise<void>
}

const initialFilters: RequisitionFilters = {
  search: '',
  plantId: null,
  sectorCode: null,
  status: null,
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
let listSeq = 0
let allSeq = 0

export const useAppStore = create<AppState>((set, get) => ({
  loading: false,
  error: null,

  stats: null,
  kpiStats: null,
  userStats: null,
  managerStats: null,
  adminStats: null,
  permissionMatrix: null,
  requisitions: [],
  clients: [],
  plants: [],
  sectors: SECTORS,

  activeRequisition: null,
  drawerOpen: false,
  clientDialogOpen: false,
  plantDialogOpen: false,
  editingPlant: null,
  editingClient: null,

  filters: { ...initialFilters },

  notifications: [],
  notificationUnread: 0,

  fetchStats: async () => {
    const stats = await api.dashboard.stats()
    set({ stats })
  },

  fetchRequisitions: async () => {
    const { filters } = get()
    const seq = ++listSeq
    try {
      const [requisitions, kpiStats] = await Promise.all([
        api.requisitions.list({
          search: filters.search || undefined,
          plantId: filters.plantId ?? undefined,
          sectorCode: filters.sectorCode ?? undefined,
          status: filters.status ?? undefined,
        }),
        api.requisitions.stats({
          search: filters.search || undefined,
          plantId: filters.plantId ?? undefined,
          sectorCode: filters.sectorCode ?? undefined,
          status: filters.status ?? undefined,
        }),
      ])
      if (seq !== listSeq) return
      set({ requisitions, kpiStats, error: null })
    } catch (error) {
      if (seq !== listSeq) return
      set({ error: error instanceof Error ? error.message : 'حدث خطأ في تحميل الطلبات' })
    }
  },

  fetchClients: async () => {
    const clients = await api.clients.list()
    set({ clients })
  },

  fetchPlants: async () => {
    const plants = await api.plants.list()
    set({ plants })
  },

  fetchSectors: async () => {
    try {
      const sectors = await api.sectors.list()
      set({ sectors })
    } catch {
      // the taxonomy is fixed — keep the built-in constant on failure
    }
  },

  fetchAll: async () => {
    const seq = ++allSeq
    set({ loading: true, error: null })
    try {
      const [stats, requisitions, clients, plants, kpiStats] = await Promise.all([
        api.dashboard.stats(),
        api.requisitions.list(),
        api.clients.list(),
        api.plants.list(),
        api.requisitions.stats(),
      ])
      const sectors = await api.sectors.list().catch(() => undefined)
      if (seq !== allSeq) return
      set({
        stats,
        requisitions,
        clients,
        plants,
        kpiStats,
        ...(sectors ? { sectors } : {}),
      })
    } catch (error) {
      if (seq !== allSeq) return
      set({ error: error instanceof Error ? error.message : 'حدث خطأ في تحميل البيانات' })
    } finally {
      if (seq === allSeq) set({ loading: false })
    }
  },

  openDrawer: async (id) => {
    try {
      const detail = await api.requisitions.detail(id)
      set({ activeRequisition: detail, drawerOpen: true })
    } catch (error) {
      const fallback = get().requisitions.find((r) => r.id === id)
      if (fallback) set({ activeRequisition: fallback, drawerOpen: true })
    }
  },

  closeDrawer: () => {
    set({ drawerOpen: false, activeRequisition: null })
  },

  openClientDialog: () => set({ clientDialogOpen: true, editingClient: null }),
  closeClientDialog: () => set({ clientDialogOpen: false, editingClient: null }),
  openPlantDialog: (plant) =>
    set({ plantDialogOpen: true, editingPlant: plant ?? null }),
  closePlantDialog: () => set({ plantDialogOpen: false, editingPlant: null }),
  openClientEditDialog: (client) =>
    set({ clientDialogOpen: true, editingClient: client }),

  setFilter: (patch) => {
    set({ filters: { ...get().filters, ...patch } })
    if (Object.prototype.hasOwnProperty.call(patch, 'search')) {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => void get().fetchRequisitions(), 300)
    } else {
      void get().fetchRequisitions()
    }
  },

  resetFilters: () => {
    set({ filters: { ...initialFilters } })
    void get().fetchRequisitions()
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setUserStats: (stats) => set({ userStats: stats }),
  setManagerStats: (stats) => set({ managerStats: stats }),
  setAdminStats: (stats) => set({ adminStats: stats }),
  setPermissionMatrix: (matrix: PermissionMatrixDto) => set({ permissionMatrix: matrix }),

  fetchNotifications: async () => {
    try {
      const data = await api.notifications.list()
      set({ notifications: data.items, notificationUnread: data.unreadCount })
    } catch {
      // silent — polling should not disrupt the app
    }
  },

  markNotificationRead: async (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
      ),
      notificationUnread: Math.max(0, get().notificationUnread - 1),
    })
    try {
      await api.notifications.markRead(id)
    } catch {
      void get().fetchNotifications()
    }
  },

  markAllNotificationsRead: async () => {
    set({
      notifications: get().notifications.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() }
      ),
      notificationUnread: 0,
    })
    try {
      await api.notifications.markAllRead()
    } catch {
      void get().fetchNotifications()
    }
  },

  createRequisition: async (body) => {
    const requisition = await api.requisitions.create(body)
    await Promise.all([get().fetchRequisitions(), get().fetchStats()])
    return requisition
  },

  updateRequisitionStatus: async (id, status, notes) => {
    const updated = await api.requisitions.updateStatus(id, status, notes)
    await Promise.all([get().fetchRequisitions(), get().fetchStats()])
    if (get().activeRequisition?.id === id) {
      const detail = await api.requisitions.detail(id)
      set({ activeRequisition: detail })
    }
    return updated
  },

  uploadAttachment: async (id, file) => {
    await api.requisitions.attachments.upload(id, file)
    if (get().activeRequisition?.id === id) {
      const detail = await api.requisitions.detail(id)
      set({ activeRequisition: detail })
    }
  },

  deleteAttachment: async (attachmentId) => {
    await api.requisitions.attachments.remove(attachmentId)
    const active = get().activeRequisition
    if (active) {
      const detail = await api.requisitions.detail(active.id)
      set({ activeRequisition: detail })
    }
  },

  updateRequisition: async (id, body) => {
    const updated = await api.requisitions.update(id, body)
    await Promise.all([get().fetchRequisitions(), get().fetchStats()])
    if (get().activeRequisition?.id === id) {
      set({ activeRequisition: updated })
    }
  },

  deleteRequisition: async (id) => {
    await api.requisitions.remove(id)
    if (get().activeRequisition?.id === id) {
      set({ activeRequisition: null, drawerOpen: false })
    }
    await Promise.all([get().fetchRequisitions(), get().fetchStats()])
  },

  createClient: async (body) => {
    const client = await api.clients.create(body)
    await Promise.all([get().fetchClients(), get().fetchPlants()])
    return client
  },

  updateClient: async (id, body) => {
    await api.clients.update(id, body)
    await Promise.all([get().fetchClients(), get().fetchPlants()])
  },

  deleteClient: async (id) => {
    await api.clients.remove(id)
    await Promise.all([get().fetchClients(), get().fetchPlants()])
  },

  createPlant: async (body) => {
    const plant = await api.plants.create(body)
    await Promise.all([get().fetchPlants(), get().fetchClients()])
    return plant
  },

  updatePlant: async (id, body) => {
    await api.plants.update(id, body)
    await Promise.all([get().fetchPlants(), get().fetchClients()])
  },

  deletePlant: async (id) => {
    await api.plants.remove(id)
    await Promise.all([get().fetchPlants(), get().fetchClients()])
  },
}))
