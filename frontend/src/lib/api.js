import axios from 'axios'
import {
  isCacheable,
  isNetworkError,
  isOffline,
  newClientRef,
  queueBill,
  readCached,
  saveCached,
  setMode,
  syncQueuedBills,
} from './offline'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
})

const OFFLINE_WRITE_MESSAGE = 'This needs an internet connection and is not available in offline mode.'

/** An error shaped like a server reply, so pages show its message the usual way. */
function offlineError(config, message) {
  const error = new Error(message)
  error.__offline = true
  error.config = config
  error.response = { status: 503, data: { message, offline: true }, headers: {}, config }
  return error
}

const isInvoiceCreate = (config) =>
  (config.method || '').toLowerCase() === 'post' && /^\/?invoices\/?$/.test(config.url || '')

/** Keep a new bill on this device; it is uploaded when the app goes back online. */
async function queueInvoice(config) {
  const payload = typeof config.data === 'string' ? JSON.parse(config.data) : { ...config.data }
  const clientRef = config.headers?.['X-Client-Ref'] || newClientRef()
  await queueBill({ ...payload, sold_at: new Date().toISOString() }, clientRef)
  return {
    data: { offline: true, id: null, client_ref: clientRef },
    status: 202,
    statusText: 'Saved offline',
    headers: {},
    config,
  }
}

/** The copy of this page's data saved the last time it was loaded online. */
async function fromCache(config) {
  const hit = await readCached(config)
  if (hit) {
    return { data: hit.data, status: 200, statusText: 'OK (offline copy)', headers: { 'x-offline-copy': String(hit.savedAt) }, config }
  }
  throw offlineError(config, 'No offline copy of this data yet. Open this page once while online to make it available offline.')
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Every new bill gets its own reference, so a retry can never create it twice.
  if (isInvoiceCreate(config) && !config.headers['X-Client-Ref']) {
    config.headers['X-Client-Ref'] = newClientRef()
  }

  // Offline mode: answer from this device instead of the network.
  if (isOffline() && !config._sync) {
    config.adapter = async (cfg) => {
      if ((cfg.method || 'get').toLowerCase() === 'get') return fromCache(cfg)
      if (isInvoiceCreate(cfg)) return queueInvoice(cfg)
      throw offlineError(cfg, OFFLINE_WRITE_MESSAGE)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (isCacheable(response.config) && !response.config._sync && !response.headers?.['x-offline-copy']) {
      saveCached(response.config, response.data)
    }
    return response
  },
  async (error) => {
    // The network dropped: switch to offline mode and carry on from this device.
    if (isNetworkError(error) && error.config && !error.config._sync) {
      setMode('offline')
      const config = error.config
      if ((config.method || 'get').toLowerCase() === 'get' && isCacheable(config)) return fromCache(config)
      if (isInvoiceCreate(config)) return queueInvoice(config)
      return Promise.reject(offlineError(config, 'The network is not available. ' + OFFLINE_WRITE_MESSAGE))
    }

    const isMaintenance = error.response?.status === 503 && error.response?.data?.maintenance_mode
    if (error.response?.status === 401 || isMaintenance) {
      localStorage.removeItem('jms_token')
      localStorage.removeItem('jms_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = isMaintenance ? '/login?maintenance=1' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

/** Upload the bills saved offline (used when switching back to online mode). */
export function syncOfflineBills() {
  return syncQueuedBills((bill) =>
    api.post('/invoices', bill.payload, {
      _sync: true,
      headers: { 'X-Client-Ref': bill.clientRef, 'X-Offline-Sale': '1' },
    })
  )
}

export function apiErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data
  if (!data) return fallback
  if (data.message) return data.message
  if (data.errors) return Object.values(data.errors).flat().join(' ')
  return fallback
}
