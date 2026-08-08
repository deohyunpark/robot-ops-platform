import {
  throughputFromPayload,
  type BackendThroughputResponse,
} from "../components/robotics-monitoring/telemetryAdapter"
import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/throughput → ThroughputResponse
 */
export async function fetchDashboardThroughput(
  signal?: AbortSignal
): Promise<BackendThroughputResponse | null> {
  const url = `${API_BASE_URL}/v1/dashboard/throughput`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Throughput API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return throughputFromPayload(json)
}
