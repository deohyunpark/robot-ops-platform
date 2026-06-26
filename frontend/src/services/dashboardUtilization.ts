/**
 * GET /v1/dashboard/utilization
 *
 * Base URL:
 * - `VITE_API_BASE_URL` if set (no trailing slash)
 * - In Vite dev: same-origin + `/v1` proxy → backend (see vite.config.ts)
 * - Production build without env: http://localhost:8080
 */
function apiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (import.meta.env.DEV) return ""
  return "http://localhost:8080"
}

export type UtilizationRowDto = {
  deviceId: string
  bucketTime: number
  totalSeconds: number
  activeSeconds: number
}

export type DeviceUtilization = {
  deviceId: string
  bucketTime: number
  totalSeconds: number
  activeSeconds: number
  utilizationPct: number
}

function toLong(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return 0
}

function toDeviceId(v: unknown): string {
  if (typeof v === "string") return v.trim()
  return ""
}

function normalizeUtilizationRecord(
  raw: Record<string, unknown>
): UtilizationRowDto | null {
  const deviceId =
    toDeviceId(raw.deviceId) ||
    toDeviceId(raw.device_id) ||
    toDeviceId(raw.robotId) ||
    toDeviceId(raw.robot_id)
  if (!deviceId) return null
  return {
    deviceId,
    bucketTime: toLong(raw.bucketTime ?? raw.bucket_time),
    totalSeconds: toLong(raw.totalSeconds ?? raw.total_seconds),
    activeSeconds: toLong(raw.activeSeconds ?? raw.active_seconds),
  }
}

function extractDtoArray(payload: unknown): UtilizationRowDto[] {
  if (Array.isArray(payload)) {
    return payload
      .map((x) =>
        x && typeof x === "object"
          ? normalizeUtilizationRecord(x as Record<string, unknown>)
          : null
      )
      .filter((x): x is UtilizationRowDto => !!x)
  }
  if (!payload || typeof payload !== "object") return []
  const obj = payload as Record<string, unknown>
  const candidates = [
    obj.items,
    obj.data,
    obj.rows,
    obj.utilizations,
    obj.devices,
    obj.results,
    obj.content,
    obj.utilizationList,
    obj.list,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return extractDtoArray(c)
  }
  const single = normalizeUtilizationRecord(obj)
  return single ? [single] : []
}

/**
 * Same device may appear in multiple buckets; aggregate active/total seconds.
 */
export function aggregateUtilizationByDevice(
  rows: UtilizationRowDto[]
): DeviceUtilization[] {
  const byId = new Map<
    string,
    { totalSeconds: number; activeSeconds: number; bucketTime: number }
  >()
  for (const r of rows) {
    const cur = byId.get(r.deviceId) ?? {
      totalSeconds: 0,
      activeSeconds: 0,
      bucketTime: 0,
    }
    cur.totalSeconds += Math.max(0, r.totalSeconds)
    cur.activeSeconds += Math.max(0, r.activeSeconds)
    cur.bucketTime = Math.max(cur.bucketTime, r.bucketTime)
    byId.set(r.deviceId, cur)
  }
  const out: DeviceUtilization[] = []
  for (const [deviceId, v] of byId) {
    const total = v.totalSeconds
    const active = v.activeSeconds
    const utilizationPct =
      total > 0 ? (active * 100.0) / total : 0
    out.push({
      deviceId,
      bucketTime: v.bucketTime,
      totalSeconds: total,
      activeSeconds: active,
      utilizationPct,
    })
  }
  out.sort((a, b) => a.deviceId.localeCompare(b.deviceId))
  return out
}

export async function fetchDashboardUtilization(
  signal?: AbortSignal
): Promise<DeviceUtilization[]> {
  const base = apiBaseUrl()
  const url = `${base}/v1/dashboard/utilization`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Utilization API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  const flat = extractDtoArray(json)
  const aggregated = aggregateUtilizationByDevice(flat)
  return aggregated
}
