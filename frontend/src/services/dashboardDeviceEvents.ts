import {
  eventBatchFromPayload,
  type BackendDeviceEvent,
} from "../components/robotics-monitoring/telemetryAdapter"
import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/events/{robotId}
 */
export async function fetchDashboardDeviceEvents(
  robotId: string,
  signal?: AbortSignal
): Promise<BackendDeviceEvent[]> {
  const id = robotId.trim()
  if (!id) return []

  const url = `${API_BASE_URL}/v1/dashboard/events/${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Device events API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return eventBatchFromPayload(json)
}
