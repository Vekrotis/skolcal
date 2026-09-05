'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { ArrowLeft, Save, Link as LinkIcon, Copy } from 'lucide-react'

export default function ICSDashboard() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [icsToken, setIcsToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (profile) {
          setUsername(profile.skola_online_username || '')
          setIcsToken(profile.ics_token)
        } else {
          // Vytvořit profil, pokud neexistuje
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({ id: user.id, calendar_mode: 'ics' })
            .select()
            .single()
            
          if (newProfile) {
            setIcsToken(newProfile.ics_token)
          }
        }
      }
      setLoading(false)
    }
    
    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          skola_online_username: username,
          skola_online_password_encrypted: password, // TODO: Šifrování na serveru/klientu
          calendar_mode: 'ics'
        })
        .eq('id', user.id)
        
      alert('Uloženo úspěšně.')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  const icsUrl = icsToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/${icsToken}.ics` : ''

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto relative z-10">
      <Link href="/dashboard" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium mb-8 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Zpět na panel
      </Link>
      
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <LinkIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold">Nastavení ICS Odběru</h1>
      </div>
      
      <GlassCard className="p-8 mb-8">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Přihlašovací údaje Škola OnLine
          </h2>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Uživatelské jméno</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heslo</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
                placeholder="Zadejte pro uložení / změnu"
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-2 disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Ukládám...' : 'Uložit údaje a aktivovat ICS mód'}
            </button>
          </div>
        </form>
      </GlassCard>

      {icsToken && (
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold mb-4">Váš odkaz k odběru</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Tento odkaz vložte do své kalendářové aplikace (Apple Kalendář, Outlook, atd.).</p>
          
          <div className="flex gap-2 mb-8">
            <input 
              type="text" 
              readOnly 
              value={icsUrl} 
              className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm font-mono text-slate-600 dark:text-slate-300 outline-none"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(icsUrl)
                alert('Zkopírováno!')
              }}
              className="flex items-center gap-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors font-medium"
            >
              <Copy className="w-4 h-4" />
              Kopírovat
            </button>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold mb-3 flex items-center gap-2">Návod pro Apple Kalendář</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Otevřete aplikaci Kalendář (iOS nebo Mac).</li>
              <li>Zvolte <strong>Přidat kalendář z odběru</strong>.</li>
              <li>Vložte zkopírovaný odkaz výše a klikněte na Odebírat.</li>
              <li>Zvolte si název, barvu a nastavte automatickou aktualizaci (např. Každý den).</li>
            </ol>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
