import { createStore, del, get, set, entries, clear } from 'idb-keyval'

/**
 * Offline support.
 *  - Mode: "online" or "offline" (kept across reloads). The app drops to offline by itself when the
 *    network fails; going back online is the user's choice, and uploads the saved bills first.
 *  - Data cache: every page's data (GET responses) is kept on this device, so pages opened before
 *    still show while offline.
 *  - Queue: sales invoices / credit bills created offline wait here until they are uploaded.
 */

const dataStore = createStore('jms-offline', 'data')
const queueStore = createStore('jms-offline-queue', 'bills')
const MODE_KEY = 'jms_mode'

const listeners = new Set()
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function emit() {
  listeners.forEach((l) => l())
}

/* ---------- mode ---------- */

export function getMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'offline' ? 'offline' : 'online'
  } catch {
    return 'online'
  }
}
export function setMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // storage unavailable: mode lives for this page only
  }
  emit()
}
export const isOffline = () => getMode() === 'offline'

/** A request that never reached the server (no response at all), as opposed to a server error. */
export function isNetworkError(error) {
  return Boolean(error) && !error.response && error.code !== 'ERR_CANCELED' && !error.__offline
}

/* ---------- data cache (GET responses) ---------- */

export function cacheKey(config) {
  const params = config.params ? JSON.stringify(Object.keys(config.params).sort().map((k) => [k, config.params[k]])) : ''
  return `${(config.url || '').replace(/^\/api/, '')}?${params}`
}
export function isCacheable(config) {
  return (
    (config.method || 'get').toLowerCase() === 'get' &&
    config.responseType !== 'blob' &&
    !/\/(pdf|export|template|delivery-note)$/.test(config.url || '')
  )
}
export async function saveCached(config, data) {
  try {
    await set(cacheKey(config), { data, savedAt: Date.now() }, dataStore)
  } catch {
    // device storage full or blocked: offline viewing of this page just won't be available
  }
}
export async function readCached(config) {
  try {
    return await get(cacheKey(config), dataStore)
  } catch {
    return undefined
  }
}
export async function clearCachedData() {
  try {
    await clear(dataStore)
  } catch {
    // nothing to clear
  }
}

/* ---------- queue of bills saved offline ---------- */

export function newClientRef() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9-]/g, '')
}

export async function queueBill(payload, clientRef) {
  const bill = { clientRef, payload, savedAt: new Date().toISOString(), error: null }
  await set(clientRef, bill, queueStore)
  emit()
  return bill
}
export async function listQueuedBills() {
  try {
    const all = await entries(queueStore)
    return all.map(([, bill]) => bill).sort((a, b) => a.savedAt.localeCompare(b.savedAt))
  } catch {
    return []
  }
}
export async function removeQueuedBill(clientRef) {
  await del(clientRef, queueStore)
  emit()
}
async function markBillFailed(bill, message) {
  await set(bill.clientRef, { ...bill, error: message }, queueStore)
}

/**
 * Upload every saved bill, oldest first. A bill the server rejects (e.g. a product was deleted) stays
 * on the device with the reason, for someone to fix or discard; a network failure stops the run.
 * `post` is the API call, passed in to avoid a circular import.
 */
export async function syncQueuedBills(post) {
  const result = { uploaded: 0, failed: 0, networkError: false }
  for (const bill of await listQueuedBills()) {
    try {
      await post(bill)
      await del(bill.clientRef, queueStore)
      result.uploaded++
    } catch (error) {
      if (isNetworkError(error)) {
        result.networkError = true
        break
      }
      const data = error?.response?.data
      const message = data?.message || (data?.errors ? Object.values(data.errors).flat().join(' ') : 'Upload failed.')
      await markBillFailed(bill, message)
      result.failed++
    }
  }
  emit()
  return result
}

/** Is the server reachable? (Bypasses the offline mode and the cache.) */
export async function serverReachable() {
  try {
    const base = import.meta.env.VITE_API_URL || '/api'
    const res = await fetch(`${base}/maintenance-status?ping=${Date.now()}`, { cache: 'no-store' })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}
