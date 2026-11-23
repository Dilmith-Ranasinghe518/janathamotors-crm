/*
 * "Install app" support. Browsers fire `beforeinstallprompt` once, often before React is ready,
 * so it is captured here as soon as the app loads and kept for the Install button.
 */
let deferredPrompt = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/** iPhone / iPad Safari has no install prompt; the app is added from the Share menu. */
export function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

export function canPromptInstall() {
  return deferredPrompt !== null
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable'
  const prompt = deferredPrompt
  deferredPrompt = null
  emit()
  prompt.prompt()
  const { outcome } = await prompt.userChoice
  return outcome
}

export function subscribeInstall(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}
