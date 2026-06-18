import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { QuoteConfig } from '../lib/types'

interface SettingsContextValue {
  config: QuoteConfig | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  save: (config: QuoteConfig) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<QuoteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/settings')
      setConfig(res.data.data as QuoteConfig)
    } catch {
      setError('Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (next: QuoteConfig) => {
    const res = await api.put('/settings', next)
    setConfig(res.data.data as QuoteConfig)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <SettingsContext.Provider value={{ config, loading, error, reload, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
