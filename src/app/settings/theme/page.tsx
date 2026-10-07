'use client'

import { useState } from 'react'
import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'

type Theme = 'light' | 'dark' | 'system' | 'brutalism' | 'brutalism-dark'

const STORAGE_KEY = 'my-indekos-theme'
const THEME_EVENT = 'my-indekos-theme-change'

const options = [
  { value: 'light', label: 'Light', description: 'Tampilan terang', Icon: SunIcon },
  { value: 'dark', label: 'Dark', description: 'Tampilan gelap', Icon: MoonIcon },
  { value: 'system', label: 'System', description: 'Ikuti pengaturan perangkat', Icon: ComputerDesktopIcon },
  {
    value: 'brutalism',
    label: 'Neo-Brutalism Light',
    description: 'Kontras tajam, kertas krem, border tebal & bayangan tegas',
    Icon: SunIcon,
  },
  {
    value: 'brutalism-dark',
    label: 'Neo-Brutalism Dark',
    description: 'Cyber-brutalism gelap, border kontras & aksen neon',
    Icon: MoonIcon,
  },
] as const

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (window.localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system'
  })

  function choose(value: Theme) {
    setTheme(value)
    window.localStorage.setItem(STORAGE_KEY, value)
    // FloatingControls owns applying the theme to <html>; tell it about the change.
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: value }))
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Tema</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pilih tampilan aplikasi.</p>
      </div>
      <div role="radiogroup" aria-label="Tema" className="space-y-2">
        {options.map(({ value, label, description, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => choose(value)}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${theme === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200' : 'border-border hover:bg-muted'}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
