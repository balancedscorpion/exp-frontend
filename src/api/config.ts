export const API_BASE = '/api/v1'

export const IS_MOCK_API =
  import.meta.env.MODE === 'mock' || import.meta.env.VITE_API_MOCK === 'true'

// Optional: add latency so loading spinners are visible in mock mode
export const MOCK_API_DELAY_MS = Number(import.meta.env.VITE_API_MOCK_DELAY_MS) || 0


