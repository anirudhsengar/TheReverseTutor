import { useState, useEffect } from 'react'
import './App.css'
import SessionView from './components/SessionView'

function App() {
  const [theme, setTheme] = useState('dark')
  // Reset logic: force remount of SessionView by changing a key
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const resetSession = () => {
    setSessionKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[var(--color-void)] text-[var(--color-white)] font-mono flex flex-col overflow-hidden relative transition-colors duration-300">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <button
          onClick={resetSession}
          className="px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all text-sm uppercase tracking-wider backdrop-blur-sm"
        >
          Reset Session
        </button>

        <button
          onClick={toggleTheme}
          className="p-3 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            // Sun Icon
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Moon Icon
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* Main Content - Center */}
      <main className="flex-1 flex items-center justify-center w-full h-screen">
        <SessionView key={sessionKey} />
      </main>
    </div>
  )
}

export default App
