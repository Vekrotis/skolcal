'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { createClient } from '@/utils/supabase/client'
import { Save, CalendarDays, Link as LinkIcon } from 'lucide-react'

export function SettingsTab({ profile }: { profile: any }) {
  const [username, setUsername] = useState(profile.skola_online_username || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates: any = { id: user.id, skola_online_username: username }
    if (password) {
      updates.skola_online_password_encrypted = password // Placeholder for real encryption if needed
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(updates)

    setSaving(false)
    if (error) {
      setMessage('Chyba při ukládání.')
    } else {
      setMessage('Údaje úspěšně uloženy!')
    }
  }

  const currentMode = profile?.calendar_mode || 'ics'

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Skola Online Credentials */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          Přihlašovací údaje
        </h2>
        <GlassCard className="p-6">
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-4 max-w-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Pro automatické stahování rozvrhu potřebujeme znát vaše přístupy do Škola OnLine.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-1">Uživatelské jméno</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={profile.skola_online_username ? '••••••••' : ''}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
                required={!profile.skola_online_username}
              />
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-medium mt-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Ukládám...' : 'Uložit údaje'}
            </button>
            {message && (
              <p className={`text-sm mt-2 ${message.includes('Chyba') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}
          </form>
        </GlassCard>
      </section>

      {/* Sync Mode */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Režim synchronizace</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/dashboard/ics" className="group block">
            <GlassCard className={`p-6 h-full transition-all border-2 ${currentMode === 'ics' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-600'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <LinkIcon className="w-5 h-5" />
                </div>
                {currentMode === 'ics' && <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full font-medium">Aktivní</span>}
              </div>
              <h3 className="text-xl font-bold mb-2">ICS Odběr (Výchozí)</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Vygeneruje unikátní odkaz, který si můžete přidat do Apple Kalendáře, Outlooku a dalších aplikací. Kalendář se sám aktualizuje.
              </p>
            </GlassCard>
          </Link>

          <Link href="/dashboard/google" className="group block">
            <GlassCard className={`p-6 h-full transition-all border-2 ${currentMode === 'google' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-transparent group-hover:border-slate-300 dark:group-hover:border-slate-600'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                {currentMode === 'google' && <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium">Aktivní</span>}
              </div>
              <h3 className="text-xl font-bold mb-2">Google Kalendář</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Události se budou zapisovat přímo do vašeho osobního Google Kalendáře. Umožňuje nastavení barev pro jednotlivé předměty.
              </p>
            </GlassCard>
          </Link>
        </div>
      </section>
      
      {/* Data Management */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-red-500">Správa dat</h2>
        <GlassCard className="p-6 border-red-500/20 dark:border-red-500/20 bg-red-50/10 dark:bg-red-900/10">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Smazat historii rozvrhu</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pokud máte v kalendáři na webu zmatek nebo se vám nenačítá správně kvůli starým datům, můžete smazat veškerou uloženou historii rozvrhu z naší databáze. 
                Následně doporučujeme kliknout na tlačítko "Synchronizovat nyní" v Google nastavení nebo znovu načíst stránku s ICS odkazem pro znovunačtení aktuálního rozvrhu ze Školy OnLine. 
                <br />
                <strong>Pozor:</strong> Smazání dat nezruší již vytvořené události v Google Kalendáři. Ty musíte odstranit manuálně přímo tam.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (confirm('Opravdu chcete smazat všechna načtená data rozvrhu z naší databáze? Toto nesmaže události přímo z vašeho Google Kalendáře.')) {
                  setSaving(true)
                  try {
                    const res = await fetch('/api/data/clear', { method: 'POST' })
                    if (res.ok) {
                      alert('Data rozvrhu byla úspěšně vymazána.')
                      window.location.reload()
                    } else {
                      const data = await res.json()
                      alert('Chyba: ' + data.error)
                    }
                  } catch (e) {
                    alert('Došlo k neznámé chybě.')
                  }
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="self-start px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              Vymazat data rozvrhu
            </button>
          </div>
        </GlassCard>
      </section>
    </div>
  )
}
