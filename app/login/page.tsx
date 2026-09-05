'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Login() {
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingDiscord, setLoadingDiscord] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleOAuthLogin = async (provider: 'google' | 'discord') => {
    provider === 'google' ? setLoadingGoogle(true) : setLoadingDiscord(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      setError(error.message)
      provider === 'google' ? setLoadingGoogle(false) : setLoadingDiscord(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Přihlášení do Skolcal</h1>
        
        {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
        
        <button
          onClick={() => handleOAuthLogin('google')}
          disabled={loadingGoogle || loadingDiscord}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50 font-medium"
        >
          {loadingGoogle ? (
            'Přihlašování...'
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Přihlásit přes Google
            </>
          )}
        </button>

        <button
          onClick={() => handleOAuthLogin('discord')}
          disabled={loadingGoogle || loadingDiscord}
          className="w-full flex items-center justify-center gap-3 bg-[#5865F2] text-white p-3 rounded-xl hover:bg-[#4752C4] transition-colors disabled:opacity-50 font-medium mt-2"
        >
          {loadingDiscord ? (
            'Přihlašování...'
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36">
                <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.73 56.6 5.37 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.1 57.36 57.36 0 0 1-9.94-4.79l1.48-1.18a74.3 74.3 0 0 0 55.22 0l1.49 1.18a57.4 57.4 0 0 1-9.97 4.79 77.39 77.39 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c7.6-25.77 1.25-49.8-14.05-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74c6.48 0 11.59 5.8 11.43 12.74 0 7-5.06 12.69-11.41 12.69zm42.24 0C78.41 65.69 73.31 60 73.31 53s5-12.74 11.43-12.74c6.48 0 11.59 5.8 11.43 12.74 0 7-5 12.69-11.48 12.69z"/>
              </svg>
              Přihlásit přes Discord
            </>
          )}
        </button>
      </div>
    </div>
  )
}
