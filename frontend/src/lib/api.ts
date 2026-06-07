import axios from 'axios'

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function attachClubToken(config: { headers?: Record<string, unknown>; url?: string }) {
  if (typeof localStorage === 'undefined') return config
  const url = config.url || ''
  if (!url.includes('/api/') && !url.startsWith('/api')) return config
  const token = localStorage.getItem('clubToken')
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(
  (config) => {
    attachClubToken(config)
    return config
  },
  (error) => Promise.reject(error)
)

/** Todas las llamadas axios a /api/* envían Bearer si hay sesión de club */
axios.interceptors.request.use(
  (config) => {
    attachClubToken(config)
    return config
  },
  (error) => Promise.reject(error)
)

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('clubToken')
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return fetch(input, { ...init, headers })
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)
