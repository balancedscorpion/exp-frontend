import { create } from 'zustand'
import { type ApiRequest } from '../api/client'

interface DebuggerState {
  requests: ApiRequest[]
  currentJson: unknown
  validationErrors: string[]

  addRequest: (request: ApiRequest) => void
  updateRequest: (id: string, updates: Partial<ApiRequest>) => void
  clearRequests: () => void
  setCurrentJson: (json: unknown) => void
  setValidationErrors: (errors: string[]) => void
}

export const useDebuggerStore = create<DebuggerState>((set) => ({
  requests: [],
  currentJson: null,
  validationErrors: [],

  addRequest: (request) =>
    set((state) => ({
      requests: [request, ...state.requests].slice(0, 100), // Keep last 100
    })),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  clearRequests: () => set({ requests: [] }),

  setCurrentJson: (json) => set({ currentJson: json }),

  setValidationErrors: (errors) => set({ validationErrors: errors }),
}))

