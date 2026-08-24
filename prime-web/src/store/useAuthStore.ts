import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, AUTH_TOKEN_KEY } from '@/lib/api'
import type { CreateUserRequest, UpdateUserRequest, UserDto } from '@/lib/types'

interface AuthState {
  token: string | null
  user: UserDto | null
  users: UserDto[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  fetchUsers: () => Promise<void>
  createUser: (body: CreateUserRequest) => Promise<void>
  updateUser: (id: number, body: UpdateUserRequest) => Promise<void>
  resetUserPassword: (id: number, newPassword: string) => Promise<void>
  deleteUser: (id: number) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      users: [],

      login: async (username, password) => {
        const response = await api.auth.login({ username, password })
        localStorage.setItem(AUTH_TOKEN_KEY, response.token)
        set({ token: response.token, user: response.user })
      },

      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        set({ token: null, user: null })
      },

      fetchMe: async () => {
        const user = await api.auth.me()
        set({ user })
      },

      changePassword: async (currentPassword, newPassword) => {
        await api.auth.changePassword({ currentPassword, newPassword })
      },

      fetchUsers: async () => {
        set({ users: await api.users.list() })
      },

      createUser: async (body) => {
        await api.users.create(body)
        await get().fetchUsers()
      },

      updateUser: async (id, body) => {
        const updated = await api.users.update(id, body)
        set({
          users: get().users.map((u) => (u.id === id ? updated : u)),
          ...(get().user?.id === id ? { user: updated } : {}),
        })
      },

      resetUserPassword: async (id, newPassword) => {
        await api.users.resetPassword(id, { newPassword })
      },

      deleteUser: async (id) => {
        await api.users.remove(id)
        set({ users: get().users.filter((u) => u.id !== id) })
      },
    }),
    {
      name: 'prime.auth',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { user?: { role?: string; roles?: string[] } } | undefined
        if (version < 2 && state?.user?.role && !state.user.roles) {
          // Migrate old single role to roles array
          state.user.roles = [state.user.role]
          delete state.user.role
        }
        return state as AuthState
      },
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)