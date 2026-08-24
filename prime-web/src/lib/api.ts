import type {
  AttachmentDto,
  ChangePasswordRequest,
  ClientDto,
  CreateClientRequest,
  CreateRequisitionRequest,
  CreateUserRequest,
  DashboardStatsDto,
  LoginRequest,
  LoginResponse,
  NotificationsListDto,
  PlantDetailDto,
  RequisitionDto,
  RequisitionStatsDto,
  ResetPasswordRequest,
  SectorDto,
  UpdateClientRequest,
  UpdatePlantRequest,
  UpdateRequisitionRequest,
  UpdateUserRequest,
  UserDto,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const AUTH_TOKEN_KEY = 'prime.auth.token'

function getToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

function clearSession() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem('prime.auth')
  } catch {
    // ignore storage errors
  }
  window.location.assign('/login')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const token = getToken()
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  })

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearSession()
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  auth: {
    login: (body: LoginRequest) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<UserDto>('/auth/me'),
    changePassword: (body: ChangePasswordRequest) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  users: {
    list: () => request<UserDto[]>('/users'),
    create: (body: CreateUserRequest) =>
      request<UserDto>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: UpdateUserRequest) =>
      request<UserDto>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    resetPassword: (id: number, body: ResetPasswordRequest) =>
      request<{ message: string }>(`/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  dashboard: {
    stats: () => request<DashboardStatsDto>('/dashboard/stats'),
  },

  requisitions: {
    list: (params?: {
      search?: string
      plantId?: number
      sectorCode?: string
      status?: string
    }) => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.plantId) qs.set('plantId', String(params.plantId))
      if (params?.sectorCode) qs.set('sectorCode', params.sectorCode)
      if (params?.status) qs.set('status', params.status)
      const query = qs.toString()
      return request<RequisitionDto[]>(`/requisitions${query ? `?${query}` : ''}`)
    },
    stats: (params?: {
      search?: string
      plantId?: number
      sectorCode?: string
      status?: string
    }) => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.plantId) qs.set('plantId', String(params.plantId))
      if (params?.sectorCode) qs.set('sectorCode', params.sectorCode)
      if (params?.status) qs.set('status', params.status)
      const query = qs.toString()
      return request<RequisitionStatsDto>(`/requisitions/stats${query ? `?${query}` : ''}`)
    },
    detail: (id: number) => request<RequisitionDto>(`/requisitions/${id}`),
    create: (body: CreateRequisitionRequest) =>
      request<RequisitionDto>('/requisitions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateStatus: (id: number, status: string, notes: string) =>
      request<RequisitionDto>(`/requisitions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
    update: (id: number, body: UpdateRequisitionRequest) =>
      request<RequisitionDto>(`/requisitions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<void>(`/requisitions/${id}`, {
        method: 'DELETE',
      }),
    attachments: {
      list: (id: number) => request<AttachmentDto[]>(`/requisitions/${id}/attachments`),
      upload: (id: number, file: File) => {
        const form = new FormData()
        form.append('file', file)
        return request<AttachmentDto>(`/requisitions/${id}/attachments`, {
          method: 'POST',
          body: form,
        })
      },
      remove: (attachmentId: number) =>
        request<void>(`/attachments/${attachmentId}`, {
          method: 'DELETE',
        }),
    },
  },
  attachments: {
    downloadUrl: (id: number) => `${BASE_URL}/attachments/${id}/download`,
  },

  clients: {
    list: () => request<ClientDto[]>('/clients'),
    create: (body: CreateClientRequest) =>
      request<ClientDto>('/clients', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: UpdateClientRequest) =>
      request<void>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<void>(`/clients/${id}`, {
        method: 'DELETE',
      }),
  },

  plants: {
    list: () => request<PlantDetailDto[]>('/plants'),
    detail: (id: number) => request<PlantDetailDto>(`/plants/${id}`),
    create: (body: UpdatePlantRequest) =>
      request<PlantDetailDto>('/plants', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: UpdatePlantRequest) =>
      request<void>(`/plants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<void>(`/plants/${id}`, {
        method: 'DELETE',
      }),
  },

  sectors: {
    list: () => request<SectorDto[]>('/sectors'),
  },

  notifications: {
    list: () => request<NotificationsListDto>('/notifications'),
    markRead: (id: number) =>
      request<void>(`/notifications/${id}/read`, {
        method: 'POST',
      }),
    markAllRead: () =>
      request<void>('/notifications/read-all', {
        method: 'POST',
      }),
  },
}