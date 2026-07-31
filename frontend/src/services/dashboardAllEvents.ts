import {
  deviceEventsFeedFromPayload,
  filterCriticalEventRows,
} from "../components/robotics-monitoring/telemetryAdapter"
import type { DeviceEventFeedRow } from "../components/robotics-monitoring/telemetryAdapter"
import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/all-events → List<RedisEventResponse> (eventName = eventType)
 */
export async function fetchDashboardAllEvents(
  signal?: AbortSignal
): Promise<DeviceEventFeedRow[]> {
  const url = `${API_BASE_URL}/v1/dashboard/all-events`
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
