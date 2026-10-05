import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { HEADER_TEXT } from './constants'
import { useSettingsStore, type ThemePreference } from '@/store/useSettingsStore'

const options: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: HEADER_TEXT.themeLight },
  { value: 'dark', label: HEADER_TEXT.themeDark },
  { value: 'system', label: HEADER_TEXT.themeSystem },
]

function isThemePreference(value: string): value is ThemePreference {
  return options.some((option) => option.value === value)
}

export function ThemeToggle() {
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)

  return (
    <div className="space-y-2 px-2 py-2">
      <p className="text-xs font-medium text-muted-foreground">{HEADER_TEXT.theme}</p>
      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(value) => {
          if (isThemePreference(value)) setTheme(value)
        }}
        aria-label={HEADER_TEXT.theme}
        className="flex w-full rounded-lg bg-muted p-1"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            title={option.label}
            className="min-w-0 flex-1 px-2"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
