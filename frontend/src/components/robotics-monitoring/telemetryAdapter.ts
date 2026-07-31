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

export type BackendThroughputPoint = {
  time: string
  count: number
}

export type BackendThroughputResponse = {
  current15MinCount: number
  hourlyRate: number
  todayCount: number
  changeRate: number
  bucketTime: { start: string; end: string }
  chart: BackendThroughputPoint[]
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

export function deviceEventFeedRowToBackendEvent(
  row: DeviceEventFeedRow
): BackendDeviceEvent {
  return {
    id: null,
    deviceId: row.deviceId,
    eventType: row.eventType,
    severity: row.severity,
    createdAt: row.ts || null,
  }
}

/** WS/API event payload — RedisEventResponse(eventName) and legacy eventType shapes. */
export function backendEventsFromPayload(input: unknown): BackendDeviceEvent[] {
  const feedRows = deviceEventsFeedFromPayload(input)
  if (feedRows.length) {
    return feedRows.map(deviceEventFeedRowToBackendEvent)
  }
  return eventBatchFromPayload(input)
}

export function resolveEventDeviceId(ev: BackendDeviceEvent): string {
  return ev.deviceId ?? ev.robotId ?? ev.payload?.robotId ?? ""
}

/** RedisEventResponse from /robot/device/offline (list). */
export type RedisEventResponse = {
  deviceId: string
  eventName: string
  /** Java OffsetDateTime → JSON (usually ISO-8601 string). */
  createAt?: string
}

function normalizeRedisEventRecord(
  raw: Record<string, unknown>
): RedisEventResponse | null {
  const deviceId =
    (typeof raw.deviceId === "string" && raw.deviceId.trim()) ||
    (typeof raw.device_id === "string" && raw.device_id.trim()) ||
    (typeof raw.robotId === "string" && raw.robotId.trim()) ||
    ""
  const eventNameRaw =
    (typeof raw.eventName === "string" && raw.eventName.trim()) ||
    (typeof raw.event_name === "string" && raw.event_name.trim()) ||
    ""
  if (!deviceId || !eventNameRaw) return null
  const createAtRaw =
    (typeof raw.createAt === "string" && raw.createAt.trim()) ||
    (typeof raw.createdAt === "string" && raw.createdAt.trim()) ||
    (typeof raw.create_at === "string" && raw.create_at.trim()) ||
    (typeof raw.created_at === "string" && raw.created_at.trim()) ||
    ""
  const out: RedisEventResponse = { deviceId, eventName: eventNameRaw }
  if (createAtRaw) out.createAt = createAtRaw
  return out
}

function extractRedisEventList(payload: unknown): RedisEventResponse[] {
  if (typeof payload === "string") {
    try {
      return extractRedisEventList(JSON.parse(payload))
    } catch {
      return []
    }
  }
  if (Array.isArray(payload)) {
    return payload
      .map((v) =>
        v && typeof v === "object"
          ? normalizeRedisEventRecord(v as Record<string, unknown>)
          : null
      )
      .filter((x): x is RedisEventResponse => !!x)
  }
  if (!payload || typeof payload !== "object") return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.payload)) return extractRedisEventList(obj.payload)
  for (const c of [
    obj.items,
    obj.data,
    obj.rows,
    obj.list,
    obj.events,
    obj.content,
    obj.body,
  ]) {
    if (Array.isArray(c)) return extractRedisEventList(c)
  }
  const one = normalizeRedisEventRecord(obj)
  return one ? [one] : []
}

/** WebSocket body: RedisEventResponse[] (or wrapped array). */
export function offlineEventBatchFromPayload(
  input: unknown
): RedisEventResponse[] {
  return extractRedisEventList(input)
}

/** Row for 장애 모달 — `/robot/device/events` 등. */
export type DeviceEventFeedRow = {
  deviceId: string
  eventType: string
  severity: string
  ts: string
}

export function mapEventTypeToSeverity(eventType: string): string {
  const t = (eventType ?? "").trim().toUpperCase()
  const critical = new Set([
    "OFFLINE",
    "COLLISION",
    "EMERGENCY_STOP",
    "OBSTACLE",
    "OVERHEAT",
    "LOW_BATTERY",
  ])
  const info = new Set(["IDLE", "CHARGING"])
  const warning = new Set(["SPEED_RISING", "CPU_RISING", "TEMP_RISING"])
  if (critical.has(t)) return "CRITICAL"
  if (info.has(t)) return "INFO"
  if (warning.has(t)) return "WARNING"
  return "UNKNOWN"
}

function normalizeDeviceEventFeedRecord(
  raw: Record<string, unknown>
): DeviceEventFeedRow | null {
  const deviceId =
    (typeof raw.deviceId === "string" && raw.deviceId.trim()) ||
    (typeof raw.device_id === "string" && raw.device_id.trim()) ||
    (typeof raw.robotId === "string" && raw.robotId.trim()) ||
    ""
  const eventType =
    (typeof raw.eventType === "string" && raw.eventType.trim()) ||
    (typeof raw.event_type === "string" && raw.event_type.trim()) ||
    (typeof raw.eventName === "string" && raw.eventName.trim()) ||
    ""
  if (!deviceId || !eventType) return null
  const severityRaw =
    (typeof raw.severity === "string" && raw.severity.trim()) || ""
  const ts =
    (typeof raw.createAt === "string" && raw.createAt.trim()) ||
    (typeof raw.create_at === "string" && raw.create_at.trim()) ||
    (typeof raw.ts === "string" && raw.ts.trim()) ||
    (typeof raw.timestamp === "string" && raw.timestamp.trim()) ||
    (typeof raw.createdAt === "string" && raw.createdAt.trim()) ||
    ""
  const severity =
    severityRaw.toUpperCase() === "CRITICAL" ||
    severityRaw.toUpperCase() === "WARNING" ||
    severityRaw.toUpperCase() === "INFO"
      ? severityRaw.toUpperCase()
      : mapEventTypeToSeverity(eventType)
  return {
    deviceId,
    eventType,
    severity,
    ts,
  }
}

export function filterCriticalEventRows(
  rows: DeviceEventFeedRow[]
): DeviceEventFeedRow[] {
  return rows.filter((r) => r.severity.toUpperCase() === "CRITICAL")
}

export function backendEventToFeedRow(
  ev: BackendDeviceEvent
): DeviceEventFeedRow | null {
  const deviceId = resolveEventDeviceId(ev)
  if (!deviceId || !ev.eventType?.trim()) return null
  return {
    deviceId,
    eventType: ev.eventType.trim(),
    severity: ev.severity?.trim() || mapEventTypeToSeverity(ev.eventType),
    ts: ev.createdAt ?? ev.payload?.ts ?? new Date().toISOString(),
  }
}

export function redisOfflineEventToFeedRow(
  ev: RedisEventResponse
): DeviceEventFeedRow {
  return {
    deviceId: ev.deviceId,
    eventType: ev.eventName,
    severity: mapEventTypeToSeverity(ev.eventName),
    ts: ev.createAt ?? new Date().toISOString(),
  }
}

export function fleetEventRowsFromPayload(input: unknown): DeviceEventFeedRow[] {
  const fromFeed = deviceEventsFeedFromPayload(input)
  if (fromFeed.length) return fromFeed
  return backendEventsFromPayload(input)
    .map(backendEventToFeedRow)
    .filter((row): row is DeviceEventFeedRow => !!row)
}

export function mergeLatestFleetEventsByDevice(
  prev: Record<string, DeviceEventFeedRow>,
  rows: DeviceEventFeedRow[]
): Record<string, DeviceEventFeedRow> {
  if (!rows.length) return prev
  const next = { ...prev }
  for (const row of rows) {
    const old = next[row.deviceId]
    if (!old || row.ts.localeCompare(old.ts) >= 0) {
      next[row.deviceId] = row
    }
  }
  return next
}

function extractDeviceEventFeedList(payload: unknown): DeviceEventFeedRow[] {
  if (typeof payload === "string") {
    try {
      return extractDeviceEventFeedList(JSON.parse(payload))
    } catch {
      return []
    }
  }
  if (Array.isArray(payload)) {
    return payload
      .map((v) =>
        v && typeof v === "object"
          ? normalizeDeviceEventFeedRecord(v as Record<string, unknown>)
          : null
      )
      .filter((x): x is DeviceEventFeedRow => !!x)
  }
  if (!payload || typeof payload !== "object") return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.payload)) return extractDeviceEventFeedList(obj.payload)
  for (const c of [
    obj.items,
    obj.data,
    obj.rows,
    obj.list,
    obj.events,
    obj.content,
    obj.body,
  ]) {
    if (Array.isArray(c)) return extractDeviceEventFeedList(c)
  }
  const one = normalizeDeviceEventFeedRecord(obj)
  return one ? [one] : []
}

/** `/robot/device/events` STOMP body → 테이블 행 (severity는 eventType 기준). */
export function deviceEventsFeedFromPayload(input: unknown): DeviceEventFeedRow[] {
  return extractDeviceEventFeedList(input)
}

/** GET/WS: TotalUtilizationResponse */
export type BackendTotalUtilizationResponse = {
  totalUtilization: number
}

export function totalUtilizationFromPayload(input: unknown): number | null {
  if (typeof input === "string") {
    try {
      return totalUtilizationFromPayload(JSON.parse(input))
    } catch {
      return null
    }
  }
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  const fromPayload =
    obj.payload && typeof obj.payload === "object"
      ? (obj.payload as Record<string, unknown>)
      : null
  const source = fromPayload ?? obj
  const raw = source.totalUtilization ?? source.total_utilization
  if (raw === undefined || raw === null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number(raw.replace(",", ".").trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

/** WS `/robot/device/feed`: AiSummaryResponse (primary) or legacy InsightFeedResponse */
export type InsightFeedItem = {
  id: string
  robotId: string
  level: string
  title: string
  /** AiSummary: currentSituation · legacy: insightDescription */
  description: string
  /** AiSummary: possibleCause */
  possibleCause: string
  recommendation: string
  score: number
  receivedAt: string
}

export function isInsightFeedStompDestination(destination?: string): boolean {
  const d = (destination ?? "").trim()
  return d.includes("/robot/device/feed")
}

export function isInsightFeedPayload(input: unknown): boolean {
  return extractInsightFeedSource(input) !== null
}

export function scoreToRiskLevel(score: number): string {
  if (score >= 80) return "HIGH"
  if (score >= 40) return "MIDDLE"
  return "LOW"
}

function levelToScore(level: string): number {
  const x = level.toUpperCase()
  if (x === "CRITICAL" || x === "HIGH") return 80
  if (x === "MIDDLE" || x === "WARNING" || x === "WARN") return 45
  if (x === "LOW" || x === "INFO") return 10
  return 0
}

function readFeedLevel(raw: Record<string, unknown>): string {
  const levelRaw =
    (typeof raw.level === "string" && raw.level.trim()) ||
    (typeof raw.Level === "string" && raw.Level.trim()) ||
    (typeof raw.riskLevel === "string" && raw.riskLevel.trim()) ||
    (typeof raw.risk_level === "string" && raw.risk_level.trim()) ||
    ""
  return levelRaw ? levelRaw.toUpperCase() : scoreToRiskLevel(toNum(raw.score, 0))
}

function isAiSummaryShape(candidate: Record<string, unknown>): boolean {
  const hasSummaryField =
    "currentSituation" in candidate ||
    "current_situation" in candidate ||
    "possibleCause" in candidate ||
    "possible_cause" in candidate
  const hasRobot =
    (typeof candidate.robotId === "string" && candidate.robotId.trim()) ||
    (typeof candidate.robot_id === "string" && candidate.robot_id.trim()) ||
    (typeof candidate.deviceId === "string" && candidate.deviceId.trim()) ||
    (typeof candidate.device_id === "string" && candidate.device_id.trim())
  return hasSummaryField && !!hasRobot
}

function normalizeAiSummaryRecord(
  raw: Record<string, unknown>,
  receivedAt: string
): InsightFeedItem | null {
  const robotId =
    (typeof raw.robotId === "string" && raw.robotId.trim()) ||
    (typeof raw.robot_id === "string" && raw.robot_id.trim()) ||
    (typeof raw.deviceId === "string" && raw.deviceId.trim()) ||
    (typeof raw.device_id === "string" && raw.device_id.trim()) ||
    ""
  const currentSituation =
    (typeof raw.currentSituation === "string" && raw.currentSituation.trim()) ||
    (typeof raw.current_situation === "string" && raw.current_situation.trim()) ||
    ""
  const possibleCause =
    (typeof raw.possibleCause === "string" && raw.possibleCause.trim()) ||
    (typeof raw.possible_cause === "string" && raw.possible_cause.trim()) ||
    ""
  const recommendation =
    (typeof raw.recommendation === "string" && raw.recommendation.trim()) ||
    ""
  if (!robotId && !currentSituation) return null

  const level = readFeedLevel(raw)
  return {
    id: robotId || "UNKNOWN",
    robotId: robotId || "UNKNOWN",
    level,
    title: "AI SUMMARY",
    description:
      currentSituation ||
      "예기치 않은 오류가 감지되었습니다. 아래에서 상세 내용을 확인하세요.",
    possibleCause: possibleCause || "원인 분석 정보가 아직 수신되지 않았습니다.",
    recommendation:
      recommendation || "현장 상태를 확인하고 필요 시 장비를 정지하세요.",
    score: levelToScore(level),
    receivedAt,
  }
}

function normalizeInsightFeedRecord(
  raw: Record<string, unknown>,
  receivedAt: string,
  fallbackLevel?: string
): InsightFeedItem | null {
  const robotId =
    (typeof raw.robotId === "string" && raw.robotId.trim()) ||
    (typeof raw.deviceId === "string" && raw.deviceId.trim()) ||
    ""
  const title =
    (typeof raw.insightTitle === "string" && raw.insightTitle.trim()) ||
    (typeof raw.insight_title === "string" && raw.insight_title.trim()) ||
    (typeof raw.title === "string" && raw.title.trim()) ||
    ""
  const description =
    (typeof raw.insightDescription === "string" && raw.insightDescription.trim()) ||
    (typeof raw.insight_description === "string" && raw.insight_description.trim()) ||
    (typeof raw.description === "string" && raw.description.trim()) ||
    ""
  const recommendation =
    (typeof raw.insightRecommendation === "string" &&
      raw.insightRecommendation.trim()) ||
    (typeof raw.insight_recommendation === "string" &&
      raw.insight_recommendation.trim()) ||
    (typeof raw.recommendation === "string" && raw.recommendation.trim()) ||
    ""
  if (!robotId && !title && !description) return null

  const score = toNum(raw.score, 0)
  const levelRaw =
    (typeof raw.riskLevel === "string" && raw.riskLevel.trim()) ||
    fallbackLevel ||
    scoreToRiskLevel(score)

  const id = `${robotId || "UNKNOWN"}|${title || "INSIGHT"}`
  return {
    id,
    robotId: robotId || "UNKNOWN",
    level: levelRaw.toUpperCase(),
    title: title || "INSIGHT",
    description:
      description ||
      "예기치 않은 오류가 감지되었습니다. 아래에서 상세 내용을 확인하세요.",
    possibleCause:
      description ||
      "원인 분석 정보가 아직 수신되지 않았습니다.",
    recommendation: recommendation || "현장 상태를 확인하고 필요 시 장비를 정지하세요.",
    score,
    receivedAt,
  }
}

function collectFeedCandidates(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return []
  const candidates: Record<string, unknown>[] = [payload as Record<string, unknown>]
  const root = payload as Record<string, unknown>
  if (root.payload && typeof root.payload === "object") {
    candidates.push(root.payload as Record<string, unknown>)
  }
  if (root.data && typeof root.data === "object") {
    candidates.push(root.data as Record<string, unknown>)
  }
  return candidates
}

function extractInsightFeedSource(payload: unknown): Record<string, unknown> | null {
  for (const candidate of collectFeedCandidates(payload)) {
    if (isAiSummaryShape(candidate)) return candidate
    if (
      "insightResponses" in candidate ||
      "insight_responses" in candidate ||
      "riskResponse" in candidate ||
      "risk_response" in candidate
    ) {
      return candidate
    }
  }
  return null
}

function readInsightResponses(source: Record<string, unknown>): unknown[] | null {
  const raw = source.insightResponses ?? source.insight_responses
  return Array.isArray(raw) ? raw : null
}

function readRiskResponse(
  source: Record<string, unknown>
): Record<string, unknown> | null {
  const raw = source.riskResponse ?? source.risk_response
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
}

function insightItemFromRisk(
  riskObj: Record<string, unknown>,
  receivedAt: string
): InsightFeedItem {
  const score = toNum(riskObj.score, 0)
  const levelRaw =
    (typeof riskObj.riskLevel === "string" && riskObj.riskLevel.trim()) ||
    (typeof riskObj.risk_level === "string" && riskObj.risk_level.trim()) ||
    scoreToRiskLevel(score)

  return {
    id: `risk|${levelRaw.toUpperCase()}`,
    robotId: "FLEET",
    level: levelRaw.toUpperCase(),
    title: "RISK SUMMARY",
    description: `플릿 리스크 점수 ${score} (${levelRaw.toUpperCase()})`,
    possibleCause: "복수 장비에서 동시에 이상 징후가 감지되었습니다.",
    recommendation: "고위험 장비부터 우선 점검하세요.",
    score,
    receivedAt,
  }
}

/** `/robot/device/feed` STOMP body → 카드 목록 */
export function insightFeedItemsFromPayload(
  input: unknown,
  receivedAt = new Date().toISOString()
): InsightFeedItem[] {
  if (typeof input === "string") {
    try {
      return insightFeedItemsFromPayload(JSON.parse(input), receivedAt)
    } catch {
      return []
    }
  }

  for (const candidate of collectFeedCandidates(input)) {
    if (isAiSummaryShape(candidate)) {
      const item = normalizeAiSummaryRecord(candidate, receivedAt)
      if (item) return [item]
    }
  }

  const source = extractInsightFeedSource(input)
  if (!source) return []

  if (isAiSummaryShape(source)) {
    const item = normalizeAiSummaryRecord(source, receivedAt)
    return item ? [item] : []
  }

  const riskObj = readRiskResponse(source)
  const fallbackLevel =
    riskObj && typeof riskObj.riskLevel === "string"
      ? riskObj.riskLevel
      : riskObj && typeof riskObj.risk_level === "string"
        ? riskObj.risk_level
        : riskObj
          ? scoreToRiskLevel(toNum(riskObj.score, 0))
          : undefined

  const responses = readInsightResponses(source)
  if (responses?.length) {
    const items = responses
      .map((row) =>
        row && typeof row === "object"
          ? normalizeInsightFeedRecord(
              row as Record<string, unknown>,
              receivedAt,
              fallbackLevel
            )
          : null
      )
      .filter((x): x is InsightFeedItem => !!x)
      .sort((a, b) => b.score - a.score)
    if (items.length) return items
  }

  if (riskObj) return [insightItemFromRisk(riskObj, receivedAt)]

  const one = normalizeInsightFeedRecord(source, receivedAt, fallbackLevel)
  return one ? [one] : []
}

export function mergeInsightFeedItems(
  existing: InsightFeedItem[],
  incoming: InsightFeedItem[],
  max = 24
): InsightFeedItem[] {
  const byId = new Map<string, InsightFeedItem>()
  for (const row of existing) byId.set(row.id, row)
  for (const row of incoming) byId.set(row.id, row)
  return Array.from(byId.values())
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, max)
}

export type InsightFeedRobotGroup = {
  robotId: string
  level: string
  maxScore: number
  receivedAt: string
  items: InsightFeedItem[]
}

function insightLevelRank(level: string): number {
  const x = level.toUpperCase()
  if (x === "CRITICAL" || x === "HIGH") return 3
  if (x === "MIDDLE" || x === "WARNING" || x === "WARN") return 2
  if (x === "LOW" || x === "INFO") return 1
  return 0
}

export function groupInsightFeedByRobot(
  items: InsightFeedItem[]
): InsightFeedRobotGroup[] {
  const byRobot = new Map<string, InsightFeedItem[]>()
  for (const item of items) {
    const key = item.robotId || "UNKNOWN"
    const list = byRobot.get(key) ?? []
    list.push(item)
    byRobot.set(key, list)
  }

  return Array.from(byRobot.entries())
    .map(([robotId, robotItems]) => {
      const sorted = [...robotItems].sort((a, b) => b.score - a.score)
      const top = sorted[0]
      const maxScore = sorted.reduce((max, row) => Math.max(max, row.score), 0)
      const level =
        sorted.reduce(
          (worst, row) =>
            insightLevelRank(row.level) > insightLevelRank(worst) ? row.level : worst,
          top?.level ?? "LOW"
        ) ?? "LOW"
      const receivedAt = sorted.reduce(
        (latest, row) => (row.receivedAt > latest ? row.receivedAt : latest),
        top?.receivedAt ?? ""
      )
      return {
        robotId,
        level,
        maxScore,
        receivedAt,
        items: sorted,
      }
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

export function throughputFromPayload(input: unknown): BackendThroughputResponse | null {
  if (typeof input === "string") {
    try {
      return throughputFromPayload(JSON.parse(input))
    } catch {
      return null
    }
  }
  const one = normalizeThroughputFrame(input)
  return one
}

function normalizeThroughputFrame(input: unknown): BackendThroughputResponse | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>

  const fromPayload =
    obj.payload && typeof obj.payload === "object"
      ? (obj.payload as Record<string, unknown>)
      : null

  const source = hasThroughputShape(fromPayload) ? fromPayload : hasThroughputShape(obj) ? obj : null
  if (!source) return null

  const rawChart = source.chart
  const chart: BackendThroughputPoint[] = Array.isArray(rawChart)
    ? rawChart
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const p = item as Record<string, unknown>
          const time = typeof p.time === "string" ? p.time : ""
          const count = toNum(p.count, Number.NaN)
          if (!time || !Number.isFinite(count)) return null
          return {
            time,
            count: Math.round(count),
          }
        })
        .filter((x): x is BackendThroughputPoint => !!x)
    : []

  const bucketTime = normalizeBucketTime(source.bucketTime)
  if (!bucketTime) return null

  return {
    current15MinCount: Math.round(toNum(source.current15MinCount, 0)),
    hourlyRate: Math.round(toNum(source.hourlyRate, 0)),
    todayCount: Math.round(toNum(source.todayCount, 0)),
    changeRate: toNum(source.changeRate, 0),
    bucketTime,
    chart,
  }
}

function hasThroughputShape(input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object") return false
  const obj = input as Record<string, unknown>
  return (
    obj.current15MinCount !== undefined ||
    obj.hourlyRate !== undefined ||
    obj.todayCount !== undefined ||
    Array.isArray(obj.chart)
  )
}

function normalizeBucketTime(
  raw: unknown
): { start: string; end: string } | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const start = typeof obj.start === "string" ? obj.start : ""
  const end = typeof obj.end === "string" ? obj.end : ""
  if (!start || !end) return null
  return { start, end }
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
