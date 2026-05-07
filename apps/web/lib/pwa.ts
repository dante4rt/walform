/**
 * Register the service worker for PWA offline support.
 * Call once from the root layout (client-side only).
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every 60 minutes.
        setInterval(() => registration.update(), 60 * 60 * 1000)
      })
      .catch((error) => {
        console.warn("[Walform] Service worker registration failed:", error)
      })
  })
}
