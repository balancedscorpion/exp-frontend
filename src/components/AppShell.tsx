import { Outlet, NavLink } from 'react-router-dom'
import { Plus, Terminal } from 'lucide-react'
import { IS_MOCK_API } from '../api/config'

export function AppShell() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-surface border-b border-hairline sticky top-0 z-30">
        <div className="h-0.5 bg-signal-500" />
        <div className="max-w-7xl mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="AI Optimiser"
                className="w-10 h-10 rounded-xl shadow-sm group-hover:shadow-md transition-shadow object-cover"
              />
              <div>
                <h1 className="font-display text-xl font-bold text-ink tracking-tight leading-none">
                  AI Optimiser
                </h1>
                <p className="eyebrow mt-1">Allocation Console</p>
              </div>
            </NavLink>

            {/* Center Nav */}
            <nav className="flex items-center gap-1">
              <NavLink
                to="/experiments"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-signal-50 text-signal-700'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-deep'
                  }`
                }
              >
                Experiments
              </NavLink>
              <NavLink
                to="/experiments/new"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-signal-50 text-signal-700'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-deep'
                  }`
                }
              >
                <Plus className="w-4 h-4" />
                Create
              </NavLink>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <NavLink
                to="/debugger"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-ink text-paper'
                      : 'text-ink-faint hover:text-ink hover:bg-paper-deep'
                  }`
                }
              >
                <Terminal className="w-3.5 h-3.5" />
                Debugger
              </NavLink>

              {IS_MOCK_API && (
                <span className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-signal-50 text-signal-700 border border-signal-200">
                  MOCK API
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
