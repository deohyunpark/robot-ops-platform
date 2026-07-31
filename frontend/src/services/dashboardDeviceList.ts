import { API_BASE_URL } from "./apiBaseUrl"

/**
 * GET /v1/dashboard/device-list → List<DeviceResponse>
 */
function normalizeDeviceId(raw: Record<string, unknown>): string | null {
  const id =
    (typeof raw.id === "string" && raw.id.trim()) ||
    (typeof raw.deviceId === "string" && raw.deviceId.trim()) ||
    (typeof raw.device_id === "string" && raw.device_id.trim()) ||
    (typeof raw.robotId === "string" && raw.robotId.trim()) ||
    (typeof raw.robot_id === "string" && raw.robot_id.trim()) ||
    ""
  return id || null
}

function extractDeviceListIds(payload: unknown): string[] {
  if (typeof payload === "string") {
    try {
      return extractDeviceListIds(JSON.parse(payload))
    } catch {
      return []
    }
  }
  if (Array.isArray(payload)) {
    const out: string[] = []
    for (const item of payload) {
      if (!item || typeof item !== "object") continue
      const id = normalizeDeviceId(item as Record<string, unknown>)
      if (id) out.push(id)
    }
    return out
  }
  if (!payload || typeof payload !== "object") return []
  const obj = payload as Record<string, unknown>
  for (const key of ["data", "payload", "content", "items", "devices", "list"]) {
    const v = obj[key]
    if (Array.isArray(v)) return extractDeviceListIds(v)
  }
  return []
}

export async function fetchDashboardDeviceList(
  signal?: AbortSignal
): Promise<string[]> {
  const url = `${API_BASE_URL}/v1/dashboard/device-list`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Device list API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  const ids = extractDeviceListIds(json)
  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
}
