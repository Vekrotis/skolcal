'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Calendar, Settings, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { ScheduleOverview } from './ScheduleOverview'
import { SettingsTab } from './SettingsTab'

export function DashboardClient({ profile, subjectColors }: { profile: any, subjectColors: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
  const [loading, setLoading] = useState(false)
  const [scheduleData, setScheduleData] = useState<any[]>(profile.schedule_data || [])
  const [error, setError] = useState<string | null>(null)

  const handleScrape = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Neznámá chyba při synchronizaci.')

      // Reload page to get fresh data from DB, or we can just fetch it. 
      // But since we just want the UI to update, we should have the API return the data or we just reload.
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="inline-flex p-1.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-2xl shadow-sm w-fit relative z-20">
        <button
          onClick={() => setActiveTab('overview')}
          className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'overview'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-800/20'
            }`}
        >
          {activeTab === 'overview' && (
            <motion.div layoutId="activeTab" className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm" style={{ zIndex: -1 }} />
          )}
          <Calendar className="w-4 h-4" />
          Přehled
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'settings'
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-800/20'
            }`}
        >
          {activeTab === 'settings' && (
            <motion.div layoutId="activeTab" className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm" style={{ zIndex: -1 }} />
          )}
          <Settings className="w-4 h-4" />
          Nastavení
        </button>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-200 dark:border-red-800/50">
          {error}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-semibold">Váš rozvrh</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Data ze Škola OnLine ({profile.skola_online_username || 'Nepřihlášen'})
              </p>
            </div>
            <button
              onClick={handleScrape}
              disabled={loading}
              className="group relative flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-6 py-2.5 rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:opacity-70 disabled:pointer-events-none active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500" />
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              {loading ? 'Synchronizuji...' : 'Aktualizovat data'}
            </button>
          </div>

          {!profile.skola_online_username ? (
            <GlassCard className="p-8 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold">Chybí přihlašovací údaje</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Pro zobrazení rozvrhu prosím přejděte do Nastavení a zadejte své přihlašovací údaje do Škola OnLine.
              </p>
              <button onClick={() => setActiveTab('settings')} className="text-indigo-600 font-medium hover:underline mt-2">
                Přejít do nastavení
              </button>
            </GlassCard>
          ) : scheduleData.length === 0 ? (
            <GlassCard className="p-12 text-center flex flex-col items-center gap-4">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
              <h3 className="text-xl font-semibold">Žádná data</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Zatím nemáme stažený rozvrh. Klikněte na tlačítko Aktualizovat.
              </p>
            </GlassCard>
          ) : (
            <ScheduleOverview data={scheduleData} subjectColors={subjectColors} />
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsTab profile={profile} />
      )}
    </div>
  )
}
