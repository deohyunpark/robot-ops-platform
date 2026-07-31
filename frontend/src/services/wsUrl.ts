export function getWsUrl(): string {
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined)?.trim()
  if (explicit) return explicit

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}/ws`
  }

  return "ws://localhost:8080/ws"
}
