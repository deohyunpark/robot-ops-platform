import { offlineEventBatchFromPayload } from "../components/robotics-monitoring/telemetryAdapter"
import type { RedisEventResponse } from "../components/robotics-monitoring/telemetryAdapter"
import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/offline → List<RedisEventResponse>
 */
export async function fetchDashboardOffline(
  signal?: AbortSignal
): Promise<RedisEventResponse[]> {
  const url = `${API_BASE_URL}/v1/dashboard/offline`
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
