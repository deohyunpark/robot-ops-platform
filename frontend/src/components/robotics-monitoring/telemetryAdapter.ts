import type { Device, DeviceStatus } from "./roboticsMonitoringDashboardTypes"

export type BackendDeviceTelemetry = {
  ts?: string
  robotId: string
  seq?: number
  batteryPct?: number | string
  state?: {
    online?: boolean
    mode?: string
    mission?: string
    batteryPct?: number | string
    speedMps?: number
  }
  pose?: {
    x?: number
    y?: number
    theta?: number
    mapId?: string
  }
  health?: {
    cpuPct?: number
    memPct?: number
    tempC?: number
  }
  safety?: {
    estop?: boolean
    bumper?: boolean
    obstacle?: boolean
  }
  errors?: Array<{ code?: string } | string>
}

export type BackendDeviceEvent = {
  id: string | null
  deviceId?: string
  robotId?: string
  eventType: string
  severity: string
  payload?: {
    speedMps?: number
    x?: number
    y?: number
    robotId?: string
    obstacle?: boolean
    seq?: number
    ts?: string
  }
  createdAt?: string | null
}

function toStatus(t: BackendDeviceTelemetry): DeviceStatus {
  const online = t.state?.online ?? false
  const battery = normalizeBatteryPct(firstDefined(t.state?.batteryPct, t.batteryPct))
  const temp = t.health?.tempC ?? 0
  const estop = t.safety?.estop ?? false
  const bumper = t.safety?.bumper ?? false
  const obstacle = t.safety?.obstacle ?? false
  const errorCode = extractErrorCode(t.errors)
  const mode = t.state?.mode ?? ""

  if (!online) return "Offline"
  if (estop || !!errorCode) return "Error"
  if (obstacle || bumper || battery <= 20 || temp >= 65) return "Warning"
  if (mode.toLowerCase() === "maintenance") return "Maintenance"
  return "Online"
}

export function telemetryToDevice(t: BackendDeviceTelemetry): Device {
  const online = t.state?.online ?? false
  const mode = t.state?.mode ?? "UNKNOWN"
  const mission = t.state?.mission ?? ""
  const batteryPct = normalizeBatteryPct(firstDefined(t.state?.batteryPct, t.batteryPct))
  const speedMps = toNum(t.state?.speedMps, 0)
  const posX = toNum(t.pose?.x, 0)
  const posY = toNum(t.pose?.y, 0)
  const theta = toNum(t.pose?.theta, 0)
  const mapId = t.pose?.mapId ?? "N/A"
  const cpuPct = toNum(t.health?.cpuPct, 0)
  const memPct = toNum(t.health?.memPct, 0)
  const tempC = toNum(t.health?.tempC, 0)
  const estop = t.safety?.estop ?? false
  const bumper = t.safety?.bumper ?? false
  const obstacle = t.safety?.obstacle ?? false
  const errorCode = extractErrorCode(t.errors)
  const updatedAt = t.ts ?? new Date().toISOString()
  const lastSeenMinutes = online ? 0 : Math.max(0, minutesSince(updatedAt))

  return {
    id: t.robotId,
    name: mode || "Unknown",
    site: mapId || "UNKNOWN-MAP",
    model: mapId || "N/A",
    status: toStatus(t),
    battery: batteryPct,
    temperature: tempC,
    lastSeenMinutes,
    emergency: estop,
    errorRate: Math.max(0, cpuPct * 0.1),
    mode,
    mission,
    speedMps,
    posX,
    posY,
    theta,
    mapId,
    cpuPct,
    memPct,
    estop,
    bumper,
    obstacle,
    errorCode,
    lastSeq: t.seq ?? 0,
    lastSeenAt: updatedAt,
    updatedAt,
  }
}

export function telemetryBatchToDevices(input: unknown): Device[] {
  if (typeof input === "string") {
    try {
      return telemetryBatchToDevices(JSON.parse(input))
    } catch {
      return []
    }
  }
  if (Array.isArray(input))
    return input
      .map((v) => normalizeFrame(v))
      .filter((v): v is BackendDeviceTelemetry => !!v)
      .map(telemetryToDevice)
  const one = normalizeFrame(input)
  if (one) return [telemetryToDevice(one)]
  return []
}

export function eventBatchFromPayload(input: unknown): BackendDeviceEvent[] {
  if (typeof input === "string") {
    try {
      return eventBatchFromPayload(JSON.parse(input))
    } catch {
      return []
    }
  }
  if (Array.isArray(input))
    return input
      .map((v) => normalizeEventFrame(v))
      .filter((v): v is BackendDeviceEvent => !!v)
  const one = normalizeEventFrame(input)
  return one ? [one] : []
}

export function resolveEventDeviceId(ev: BackendDeviceEvent): string {
  return ev.deviceId ?? ev.robotId ?? ev.payload?.robotId ?? ""
}

function normalizeFrame(input: unknown): BackendDeviceTelemetry | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>

  // If backend wraps payload: { topic: "/robot/device/state", payload: {...} }
  if (obj.payload && typeof obj.payload === "object") {
    const payload = obj.payload as Record<string, unknown>
    if (
      typeof payload.robotId === "string" &&
      typeof payload.state === "object" &&
      payload.state !== null
    ) {
      return payload as BackendDeviceTelemetry
    }
  }

  if (
    typeof obj.robotId === "string" &&
    typeof obj.state === "object" &&
    obj.state !== null
  ) {
    return obj as BackendDeviceTelemetry
  }
  return null
}

function normalizeEventFrame(input: unknown): BackendDeviceEvent | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>

  if (obj.payload && typeof obj.payload === "object") {
    const payload = obj.payload as Record<string, unknown>
    const eventType = payload.eventType
    const deviceId = payload.deviceId ?? payload.robotId
    if (typeof eventType === "string" && typeof deviceId === "string") {
      return {
        ...(payload as BackendDeviceEvent),
        deviceId,
      }
    }
  }

  const eventType = obj.eventType
  const deviceId = obj.deviceId ?? obj.robotId
  if (typeof deviceId === "string" && typeof eventType === "string") {
    return {
      ...(obj as BackendDeviceEvent),
      deviceId,
    }
  }
  return null
}

function extractErrorCode(errors?: Array<{ code?: string } | string>): string {
  if (!errors?.length) return ""
  const first = errors[0]
  if (typeof first === "string") return first
  return first?.code ?? ""
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const normalized = v.replace("%", "").replace(",", ".").trim()
    const n = Number(normalized)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function normalizeBatteryPct(v: unknown): number {
  const raw = toNum(v, 0)
  // Some backends send battery as ratio(0~1), others as percent(0~100).
  const pct = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, pct))
}

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  for (const v of values) {
    if (v !== undefined) return v
  }
  return undefined
}

function minutesSince(iso?: string): number {
  if (!iso) return 0
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 0
  return Math.floor((Date.now() - ts) / 60000)
}
