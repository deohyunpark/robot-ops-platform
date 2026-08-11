import type {
  AckResponse,
  ActionChecklistItemResponse,
} from "../../services/eventAction"
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

export type EventChecklistItem = {
  id: string
  label: string
  checked: boolean
}

export type EventDetailAckState = {
  acknowledged: boolean
  assignee: string
  acknowledgedAt: string
  resolved: boolean
  resolvedAt: string
  resolutionDescription: string
  checklist: EventChecklistItem[]
  draftSavedAt: string
  backendEventId: number | null
  eventActionId: number | null
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
      if (!best || (!best.id && ev.id)) best = ev
      continue
    }
    const delta = Math.abs(ms - rowTs)
    if (delta < bestDelta || (delta === bestDelta && !best?.id && ev.id)) {
      bestDelta = delta
      best = ev
    }
  }
  return best
}

export function parseBackendEventId(id: string | null | undefined): number | null {
  if (id == null) return null
  const trimmed = String(id).trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function resolveAckBackendEvent(
  events: BackendDeviceEvent[],
  row: DeviceEventFeedRow
): BackendDeviceEvent | null {
  const matched = findMatchingBackendEvent(events, row)
  if (parseBackendEventId(matched?.id ?? null)) return matched

  const rowTs = parseKoreanTimestampMs(row.ts)
  const candidates = events.filter(
    (ev) =>
      (ev.eventType ?? "").toUpperCase() === row.eventType.toUpperCase() &&
      parseBackendEventId(ev.id) != null
  )
  if (!candidates.length) return matched

  if (Number.isNaN(rowTs)) return candidates[0]

  let best = candidates[0]
  let bestDelta = Number.POSITIVE_INFINITY
  for (const ev of candidates) {
    const ms = parseKoreanTimestampMs(eventTimestamp(ev))
    if (Number.isNaN(ms)) continue
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
    resolutionDescription: "",
    checklist: [],
    draftSavedAt: "",
    backendEventId: null,
    eventActionId: null,
  }
}

export const ASSIGNEE_OPTIONS = [
  "김현장",
  "이운영",
  "박정비",
  "최관제",
  "정배치",
] as const

const CHECKLIST_TEMPLATES_KO: Record<string, string[]> = {
  OFFLINE: [
    "현장 통신 장비 상태 확인",
    "로봇 전원 및 네트워크 재기동",
    "MQTT/브로커 연결 점검",
    "복구 후 텔레메트리 수신 확인",
  ],
  EMERGENCY_STOP: [
    "현장 안전 구역 확보",
    "E-STOP 원인 확인 및 해제",
    "센서·범퍼 상태 점검",
    "재가동 전 경로 이상 여부 확인",
  ],
  EMERGENCY: [
    "현장 안전 상태 확인",
    "비상 원인 파악 및 기록",
    "관련 장비 정지/격리",
    "복구 절차 수행 및 재가동",
  ],
  LOW_BATTERY: [
    "배터리 잔량 및 충전 상태 확인",
    "충전 스테이션 이동/연결",
    "회수 또는 교체 필요 여부 판단",
    "충전 후 정상 동작 확인",
  ],
  COLLISION: [
    "충돌 지점 현장 확인",
    "장애물 제거 및 손상 점검",
    "센서 캘리브레이션 확인",
    "테스트 주행 후 정상화 확인",
  ],
  OBSTACLE: [
    "경로상 장애물 확인",
    "장애물 제거 또는 우회 경로 설정",
    "맵/경로 데이터 이상 여부 확인",
    "재시작 후 이동 테스트",
  ],
  OVERHEAT: [
    "장비 온도 및 냉각 상태 확인",
    "부하/속도 설정 점검",
    "주변 환경(환기) 확인",
    "정상 온도 복귀 확인",
  ],
}

const CHECKLIST_DEFAULT_KO = [
  "현장 안전 상태 확인",
  "장비 상태 및 로그 점검",
  "원인 분석 및 조치 기록",
  "관련 담당자 공유",
  "복구 후 정상 동작 확인",
]

const CHECKLIST_TEMPLATES_EN: Record<string, string[]> = {
  OFFLINE: [
    "Check on-site network equipment",
    "Restart robot power and network",
    "Verify MQTT broker connectivity",
    "Confirm telemetry after recovery",
  ],
  EMERGENCY_STOP: [
    "Secure the work area",
    "Identify and release E-STOP cause",
    "Inspect sensors and bumper",
    "Verify path before restart",
  ],
  EMERGENCY: [
    "Confirm on-site safety",
    "Identify and record emergency cause",
    "Isolate affected equipment",
    "Execute recovery and restart",
  ],
  LOW_BATTERY: [
    "Check battery level and charging",
    "Move/connect to charging station",
    "Decide retrieval or swap if needed",
    "Verify normal operation after charge",
  ],
  COLLISION: [
    "Inspect collision site",
    "Remove obstacles and check damage",
    "Verify sensor calibration",
    "Test drive after recovery",
  ],
  OBSTACLE: [
    "Inspect path obstruction",
    "Remove obstacle or reroute",
    "Check map/path data",
    "Test movement after restart",
  ],
  OVERHEAT: [
    "Check temperature and cooling",
    "Review load/speed settings",
    "Verify ventilation environment",
    "Confirm return to normal temp",
  ],
}

const CHECKLIST_DEFAULT_EN = [
  "Confirm on-site safety",
  "Inspect device status and logs",
  "Analyze cause and record actions",
  "Share update with stakeholders",
  "Verify normal operation after fix",
]

export function checklistItemsFromActionResponse(
  items: ActionChecklistItemResponse[]
): EventChecklistItem[] {
  return [...items]
    .sort((a, b) => a.sequence - b.sequence)
    .map((item) => ({
      id: String(item.id),
      label: item.content,
      checked: item.checked,
    }))
}

export function ackStateFromActionResponse(
  response: AckResponse,
  backendEventId: number,
  existing?: Partial<EventDetailAckState>
): EventDetailAckState {
  const base = normalizeAckState(existing)
  return {
    ...base,
    acknowledged: true,
    assignee: response.operation || base.assignee,
    acknowledgedAt: response.ackStartTime || base.acknowledgedAt,
    backendEventId,
    eventActionId: response.checkListId,
    checklist: checklistItemsFromActionResponse(
      response.actionChecklistItemResponses ?? []
    ),
  }
}

export function checklistSavePayload(
  checklist: EventChecklistItem[],
  description: string
): {
  description: string
  itemSaveRequests: { id: number; checked: boolean }[]
} {
  return {
    description: description.trim(),
    itemSaveRequests: checklist
      .map((item) => ({
        id: Number(item.id),
        checked: item.checked,
      }))
      .filter((item) => Number.isFinite(item.id)),
  }
}

export function buildEventChecklist(
  eventType: string,
  language: "ko" | "en"
): EventChecklistItem[] {
  const type = eventType.trim().toUpperCase() || "EVENT"
  const ko = language === "ko"
  const templates = ko ? CHECKLIST_TEMPLATES_KO : CHECKLIST_TEMPLATES_EN
  const labels = templates[type] ?? (ko ? CHECKLIST_DEFAULT_KO : CHECKLIST_DEFAULT_EN)
  return labels.map((label, index) => ({
    id: `${type}-${index}`,
    label,
    checked: false,
  }))
}

export function normalizeAckState(
  raw: Partial<EventDetailAckState> | undefined
): EventDetailAckState {
  const base = defaultAckState()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    checklist: Array.isArray(raw.checklist)
      ? raw.checklist.map((item, index) => ({
          id: item.id || `item-${index}`,
          label: item.label || "",
          checked: Boolean(item.checked),
        }))
      : [],
    draftSavedAt: raw.draftSavedAt ?? "",
    backendEventId:
      typeof raw.backendEventId === "number" && Number.isFinite(raw.backendEventId)
        ? raw.backendEventId
        : null,
    eventActionId:
      typeof raw.eventActionId === "number" && Number.isFinite(raw.eventActionId)
        ? raw.eventActionId
        : null,
  }
}

export function checklistProgress(checklist: EventChecklistItem[]): {
  checked: number
  total: number
  percent: number
} {
  const total = checklist.length
  if (total === 0) return { checked: 0, total: 0, percent: 0 }
  const checked = checklist.filter((item) => item.checked).length
  return {
    checked,
    total,
    percent: Math.round((checked / total) * 100),
  }
}

export function loadEventAckMap(): Record<string, EventDetailAckState> {
  try {
    const raw =
      localStorage.getItem("rm-event-ack-v2") ??
      localStorage.getItem("rm-event-ack-v1")
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<EventDetailAckState>>
    if (!parsed || typeof parsed !== "object") return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        normalizeAckState(value),
      ])
    )
  } catch {
    return {}
  }
}

export function saveEventAckMap(map: Record<string, EventDetailAckState>) {
  try {
    localStorage.setItem("rm-event-ack-v2", JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

export function clearEventAckMap() {
  try {
    localStorage.removeItem("rm-event-ack-v2")
    localStorage.removeItem("rm-event-ack-v1")
  } catch {
    /* ignore */
  }
}
