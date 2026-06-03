/**
 * Theme management with system preference default.
 * Reads/writes theme to Dexie meta on init and changes.
 */
import { getMeta, upsertMeta } from '../data/db'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const ROOT = document.documentElement

export async function initTheme(): Promise<void> {
  const meta = await getMeta()
  const saved = meta?.theme ?? 'system'
  applyTheme(saved)
}

export async function setTheme(theme: Theme): Promise<void> {
  applyTheme(theme)
  await upsertMeta({ theme })
}

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  ROOT.classList.remove('light', 'dark')
  ROOT.classList.add(resolved)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}