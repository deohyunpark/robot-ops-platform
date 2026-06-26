import type { BackendDeviceEvent, DeviceEventFeedRow } from "./telemetryAdapter"
import { parseKoreanTimestampMs } from "./roboticsMonitoringUtils"

const EVENT_PAYLOAD_MESSAGES_KO: Record<string, string> = {
  OFFLINE: "장비와의 통신이 끊겼습니다. 마지막 하트비트 이후 응답이 없습니다.",
  LOW_BATTERY: "배터리 잔량이 안전 임계값 이하입니다. 충전 또는 회수가 필요합니다.",
  EMERGENCY_STOP: "비상 정지(E-STOP)가 활성화되었습니다. 현장 안전 확인이 필요합니다.",
  EMERGENCY: "비상 상태가 감지되었습니다. 즉시 작업을 중단하고 원인을 확인하세요.",
  COLLISION: "충돌 센서가 작동했습니다. 장비 주변 장애물 및 손상 여부를 확인하세요.",
  OBSTACLE: "경로상 장애물이 감지되어 이동이 중단되었습니다.",
  OVERHEAT: "장비 온도가 허용 범위를 초과했습니다. 냉각 및 부하 점검이 필요합니다.",
  SPEED_RISING: "이동 속도가 급격히 상승하고 있습니다.",
  CPU_RISING: "CPU 사용률이 지속적으로 상승 중입니다.",
  TEMP_RISING: "온도가 지속적으로 상승 중입니다.",
  IDLE: "장비가 대기(IDLE) 상태로 전환되었습니다.",
  CHARGING: "충전 중입니다.",
}

const STATE_LIKE_EVENT_TYPES = new Set([
  "IDLE",
  "CHARGING",
  "PICKING",
  "PICK",
  "PACK",
  "MOVING",
  "NAVIGATING",
  "DOCKING",
  "EMERGENCY",
  "EMERGENCY_STOP",
  "OFFLINE",
  "MAINTENANCE",
  "LOW_BATTERY",
  "COLLISION",
  "OBSTACLE",
])

export type EventTimelineEntry = {
  id: string
  label: string
  ts: string
  isSelected: boolean
  isError: boolean
}

export type EventDetailAckState = {
  acknowledged: boolean
  assignee: string
  acknowledgedAt: string
  resolved: boolean
  resolvedAt: string
}

export function outageEventRowKey(row: DeviceEventFeedRow): string {
  return `${row.deviceId}|${row.eventType}|${row.ts}`
}

export function eventTimestamp(ev: BackendDeviceEvent): string {
  return ev.payload?.ts ?? ev.createdAt ?? ""
}

export function findMatchingBackendEvent(
  events: BackendDeviceEvent[],
  row: DeviceEventFeedRow
): BackendDeviceEvent | null {
  const rowTs = parseKoreanTimestampMs(row.ts)
  let best: BackendDeviceEvent | null = null
  let bestDelta = Number.POSITIVE_INFINITY

  for (const ev of events) {
    if ((ev.eventType ?? "").toUpperCase() !== row.eventType.toUpperCase()) continue
    const ts = eventTimestamp(ev)
    const ms = parseKoreanTimestampMs(ts)
    if (Number.isNaN(ms) || Number.isNaN(rowTs)) {
      if (!best) best = ev
      continue
    }
    const delta = Math.abs(ms - rowTs)
    if (delta < bestDelta) {
      bestDelta = delta
      best = ev
    }
  }
  return best
}

function payloadDetailLines(payload: BackendDeviceEvent["payload"]): string[] {
  if (!payload) return []
  const lines: string[] = []
  if (payload.obstacle === true) lines.push("경로 장애물 감지")
  if (typeof payload.speedMps === "number")
    lines.push(`속도 ${payload.speedMps.toFixed(2)} m/s`)
  if (typeof payload.x === "number" && typeof payload.y === "number")
    lines.push(`위치 x:${payload.x.toFixed(2)}, y:${payload.y.toFixed(2)}`)
  return lines
}

export function formatEventPayloadMessage(
  row: DeviceEventFeedRow,
  backendEvent: BackendDeviceEvent | null,
  language: "ko" | "en"
): string {
  const type = row.eventType.toUpperCase()
  const base =
    language === "ko"
      ? EVENT_PAYLOAD_MESSAGES_KO[type] ?? `${type} 이벤트가 발생했습니다.`
      : `${type} event detected.`

  const detail = payloadDetailLines(backendEvent?.payload)
  if (!detail.length) return base
  return `${base}\n${detail.join(" · ")}`
}

export function formatEventDurationLabel(
  eventType: string,
  ts: string,
  resolvedAt?: string
): string {
  const start = parseKoreanTimestampMs(ts)
  if (Number.isNaN(start)) return "-"
  const end = resolvedAt ? parseKoreanTimestampMs(resolvedAt) : Date.now()
  const endMs = Number.isNaN(end) ? Date.now() : end
  const diffMs = Math.max(0, endMs - start)
  const min = Math.floor(diffMs / 60000)
  const label = eventType.toUpperCase() || "EVENT"

  if (min < 1) return `1분 미만 ${label}`
  if (min < 60) return `${min}분째 ${label}`
  const hour = Math.floor(min / 60)
  const rem = min % 60
  if (hour < 24) {
    return rem > 0 ? `${hour}시간 ${rem}분째 ${label}` : `${hour}시간째 ${label}`
  }
  const day = Math.floor(hour / 24)
  return `${day}일째 ${label}`
}

export function buildMissionTimeline(
  deviceEvents: BackendDeviceEvent[],
  selected: DeviceEventFeedRow,
  currentMission?: string,
  currentMode?: string
): EventTimelineEntry[] {
  const selectedTs = parseKoreanTimestampMs(selected.ts)
  const entries: EventTimelineEntry[] = []

  const sorted = [...deviceEvents].sort((a, b) => {
    const ta = parseKoreanTimestampMs(eventTimestamp(a))
    const tb = parseKoreanTimestampMs(eventTimestamp(b))
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb)
  })

  for (const ev of sorted) {
    const type = (ev.eventType ?? "").toUpperCase()
    if (!STATE_LIKE_EVENT_TYPES.has(type)) continue
    const ts = eventTimestamp(ev)
    if (!ts) continue
    const evTs = parseKoreanTimestampMs(ts)
    const isSelected =
      type === selected.eventType.toUpperCase() &&
      (Number.isNaN(selectedTs) ||
        Number.isNaN(evTs) ||
        Math.abs(evTs - selectedTs) < 120_000)
    entries.push({
      id: `${type}|${ts}`,
      label: type,
      ts,
      isSelected,
      isError:
        type === "EMERGENCY" ||
        type === "EMERGENCY_STOP" ||
        type === "OFFLINE" ||
        type === "COLLISION" ||
        type === "LOW_BATTERY",
    })
  }

  const tail = (currentMission || currentMode || "").toUpperCase()
  if (tail && !entries.some((e) => e.label === tail)) {
    entries.push({
      id: `current|${tail}`,
      label: tail,
      ts: new Date().toISOString(),
      isSelected: false,
      isError: false,
    })
  }

  if (!entries.length) {
    entries.push({
      id: `selected|${selected.eventType}`,
      label: selected.eventType.toUpperCase(),
      ts: selected.ts,
      isSelected: true,
      isError: true,
    })
  }

  return entries.slice(-12)
}

export function defaultAckState(): EventDetailAckState {
  return {
    acknowledged: false,
    assignee: "",
    acknowledgedAt: "",
    resolved: false,
    resolvedAt: "",
  }
}

export function loadEventAckMap(): Record<string, EventDetailAckState> {
  try {
    const raw = localStorage.getItem("rm-event-ack-v1")
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EventDetailAckState>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function saveEventAckMap(map: Record<string, EventDetailAckState>) {
  try {
    localStorage.setItem("rm-event-ack-v1", JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}
