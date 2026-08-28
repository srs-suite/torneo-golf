import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function resolveRequestPath(config: { baseURL?: string; url?: string }): string {
  const path = config.url || ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (config.baseURL || '').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function attachClubToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (typeof localStorage === 'undefined') return config
  const fullPath = resolveRequestPath(config)
  if (!fullPath.includes('/api/') && !fullPath.startsWith('/api')) return config
  const token = localStorage.getItem('clubToken')
  if (!token) return config

  if (!config.headers) {
    config.headers = new AxiosHeaders()
  }

  const headers = config.headers
  const existing =
    (typeof headers.get === 'function' ? headers.get('Authorization') : undefined) ||
    (headers as { Authorization?: string; authorization?: string }).Authorization ||
    (headers as { Authorization?: string; authorization?: string }).authorization
  if (existing) return config

  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    ;(headers as { Authorization: string }).Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(
  (config) => attachClubToken(config),
  (error) => Promise.reject(error)
)

/** Todas las llamadas axios a /api/* envían Bearer si hay sesión de club */
axios.interceptors.request.use(
  (config) => attachClubToken(config),
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
