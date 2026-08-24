import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'تلقائي (حسب النظام)' },
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'داكن' },
]

export const SETTINGS_STORAGE_KEY = 'prime-settings'

interface SettingsState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  resetDefaults: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      resetDefaults: () => set({ theme: 'system' }),
    }),
    { name: SETTINGS_STORAGE_KEY }
  )
)

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function themeIsDark(theme: ThemePreference): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark())
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle('dark', themeIsDark(theme))
}