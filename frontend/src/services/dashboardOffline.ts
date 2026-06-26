import { offlineEventBatchFromPayload } from "../components/robotics-monitoring/telemetryAdapter"
import type { RedisEventResponse } from "../components/robotics-monitoring/telemetryAdapter"

/**
 * GET /v1/dashboard/offline → List<RedisEventResponse>
 *
 * Base URL: same rules as `dashboardUtilization.ts`.
 */
function apiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (import.meta.env.DEV) return ""
  return "http://localhost:8080"
}

export async function fetchDashboardOffline(
  signal?: AbortSignal
): Promise<RedisEventResponse[]> {
  const base = apiBaseUrl()
  const url = `${base}/v1/dashboard/offline`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Offline API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return offlineEventBatchFromPayload(json)
}
