import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getMode, listQueuedBills, removeQueuedBill, serverReachable, setMode, subscribe } from '../lib/offline'
import { syncOfflineBills } from '../lib/api'

const NetworkContext = createContext(null)

/**
 * Online / offline mode for the whole app.
 *  - mode: what the app is doing ("online" talks to the server, "offline" works from this device)
 *  - networkAvailable: whether the server can actually be reached right now
 * The app falls back to offline by itself; switching back to online is offered when the network
 * returns, and first uploads every bill saved offline.
 */
export function NetworkProvider({ children }) {
  const queryClient = useQueryClient()
  const [mode, setModeState] = useState(getMode)
  const [networkAvailable, setNetworkAvailable] = useState(() => navigator.onLine)
  const [queue, setQueue] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  const refresh = useCallback(async () => {
    setModeState(getMode())
    setQueue(await listQueuedBills())
  }, [])

  useEffect(() => {
    refresh()
    return subscribe(refresh)
  }, [refresh])

  // Browser connectivity events; losing the network moves the app to offline mode.
  useEffect(() => {
    const goneOffline = () => {
      setNetworkAvailable(false)
      setMode('offline')
    }
    const backOnline = async () => setNetworkAvailable(await serverReachable())
    window.addEventListener('offline', goneOffline)
    window.addEventListener('online', backOnline)
    return () => {
      window.removeEventListener('offline', goneOffline)
      window.removeEventListener('online', backOnline)
    }
  }, [])

  // While offline, check every 15 s whether the server is reachable again.
  useEffect(() => {
    if (mode !== 'offline') {
      setNetworkAvailable(true)
      return
    }
    let stopped = false
    const check = async () => {
      const ok = await serverReachable()
      if (!stopped) setNetworkAvailable(ok)
    }
    check()
    const timer = setInterval(check, 15000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [mode])

  const goOffline = useCallback(() => setMode('offline'), [])

  /** Upload saved bills, then return to online mode (stays offline if the network fails again). */
  const goOnline = useCallback(async () => {
    setSyncing(true)
    try {
      if (!(await serverReachable())) {
        setNetworkAvailable(false)
        setLastSync({ uploaded: 0, failed: 0, networkError: true })
        return
      }
      const result = await syncOfflineBills()
      setLastSync(result)
      if (!result.networkError) {
        setMode('online')
        queryClient.invalidateQueries()
      }
    } finally {
      setSyncing(false)
      refresh()
    }
  }, [queryClient, refresh])

  const discardBill = useCallback(async (clientRef) => {
    await removeQueuedBill(clientRef)
  }, [])

  return (
    <NetworkContext.Provider
      value={{ mode, networkAvailable, queue, syncing, lastSync, goOffline, goOnline, discardBill, clearLastSync: () => setLastSync(null) }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
