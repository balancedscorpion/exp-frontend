import { Outlet, NavLink } from 'react-router-dom'
import { Plus, Terminal } from 'lucide-react'
import { IS_MOCK_API } from '../api/config'

export function AppShell() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <img 
                src="/logo.png" 
                alt="AI Optimiser" 
                className="w-10 h-10 rounded-xl shadow-md group-hover:shadow-lg transition-shadow object-cover"
              />
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
                  AI Optimiser
                </h1>
                <p className="text-xs text-slate-500 -mt-0.5">Configuration</p>
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
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Terminal className="w-3.5 h-3.5" />
                Debugger
              </NavLink>

              {IS_MOCK_API && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
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
