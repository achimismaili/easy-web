export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ew-theme'

export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  if (theme === 'system') {
    delete document.documentElement.dataset['theme']
    localStorage.removeItem(STORAGE_KEY)
  } else {
    document.documentElement.dataset['theme'] = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }
}

export function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'system'
}

export function subscribeToSystem(cb: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => cb(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

export const noFlashScript: string =
  `(function(){try{var s=localStorage.getItem('ew-theme');if(s==='light'||s==='dark'){document.documentElement.dataset.theme=s}}catch(e){}})()`
