import {
  deviceEventsFeedFromPayload,
  filterCriticalEventRows,
} from "../components/robotics-monitoring/telemetryAdapter"
import type { DeviceEventFeedRow } from "../components/robotics-monitoring/telemetryAdapter"

/**
 * GET /v1/dashboard/all-events → List<RedisEventResponse> (eventName = eventType)
 *
 * Base URL: same rules as `dashboardUtilization.ts`.
 */
function apiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (import.meta.env.DEV) return ""
  return "http://localhost:8080"
}

export async function fetchDashboardAllEvents(
  signal?: AbortSignal
): Promise<DeviceEventFeedRow[]> {
  const base = apiBaseUrl()
  const url = `${base}/v1/dashboard/all-events`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `All-events API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return deviceEventsFeedFromPayload(json)
}

export async function fetchDashboardCriticalOutageEvents(
  signal?: AbortSignal
): Promise<DeviceEventFeedRow[]> {
  const rows = await fetchDashboardAllEvents(signal)
  return filterCriticalEventRows(rows)
}
