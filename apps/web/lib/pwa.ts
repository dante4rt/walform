/**
 * Register the service worker for PWA offline support.
 * Call once from the root layout (client-side only).
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

  if (process.env.NODE_ENV === "development") {
    window.addEventListener("load", () => {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .then(() =>
          "caches" in window
            ? window.caches
                .keys()
                .then((keys) =>
                  Promise.all(
                    keys
                      .filter((key) => key.startsWith("walform-"))
                      .map((key) => window.caches.delete(key)),
                  ),
                )
            : undefined,
        )
        .catch((error) => {
          console.warn("[Walform] Service worker cleanup failed:", error)
        })
    })
    return
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        void registration.update()
        // Check for updates every 60 minutes.
        setInterval(() => registration.update(), 60 * 60 * 1000)
      })
      .catch((error) => {
        console.warn("[Walform] Service worker registration failed:", error)
      })
  })
}
