import { insightFeedItemsFromApiResponse } from "../components/robotics-monitoring/telemetryAdapter"
import type { InsightFeedItem } from "../components/robotics-monitoring/telemetryAdapter"
import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/feed
 */
export async function fetchDashboardFeed(
  signal?: AbortSignal
): Promise<InsightFeedItem[]> {
  const url = `${API_BASE_URL}/v1/dashboard/feed`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Dashboard feed API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return insightFeedItemsFromApiResponse(json)
}
