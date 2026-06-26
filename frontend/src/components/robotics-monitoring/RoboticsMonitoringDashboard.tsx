import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createSocket } from "../../services/ws"
import {
  fetchDashboardAllEvents,
  fetchDashboardCriticalOutageEvents,
} from "../../services/dashboardAllEvents"
import { fetchDashboardDeviceList } from "../../services/dashboardDeviceList"
import { fetchDashboardOffline } from "../../services/dashboardOffline"
import {
  fetchDashboardUtilization,
  type DeviceUtilization,
} from "../../services/dashboardUtilization"
import { EventDetailModal } from "./EventDetailModal"
import { useDeviceTableRenderer } from "./DashboardDeviceTable"
import {
  defaultAckState,
  loadEventAckMap,
  saveEventAckMap,
  type EventDetailAckState,
} from "./eventDetailUtils"
import {
  Badge,
  BatteryGauge,
  KPI,
  MetricCard,
  Sparkline,
} from "./DashboardParts"
import { roboticsMonitoringDashboardDefaults } from "./roboticsMonitoringDashboardDefaults"
import type {
  Device,
  DeviceStatus,
  RoboticsMonitoringDashboardProps,
} from "./roboticsMonitoringDashboardTypes"
import {
  deviceEventsFeedFromPayload,
  eventBatchFromPayload,
  offlineEventBatchFromPayload,
  resolveEventDeviceId,
  telemetryBatchToDevices,
  throughputFromPayload,
  totalUtilizationFromPayload,
} from "./telemetryAdapter"
import type {
  BackendDeviceEvent,
  BackendThroughputResponse,
  DeviceEventFeedRow,
} from "./telemetryAdapter"
import { useElementInView } from "./useElementInView"
import {
  clamp,
  coerceFontSize,
  formatBattery,
  formatKoreanDateTime,
  formatKoreanRelativeTime,
  formatKoreanTime,
  parseKoreanTimestampMs,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

const isStatic = false
const DAISY_LOGO_SRC = "/daisy-logo.png?v=2"

function outageRowSeverityRank(severity: string): number {
  const x = severity.toUpperCase()
  if (x === "CRITICAL" || x === "ERROR") return 0
  if (x === "WARN" || x === "WARNING") return 1
  if (x === "INFO") return 2
  return 3
}

function compareOutageModalRows(
  a: { severity: string; ts: string },
  b: { severity: string; ts: string }
): number {
  const r = outageRowSeverityRank(a.severity) - outageRowSeverityRank(b.severity)
  if (r !== 0) return r
  return b.ts.localeCompare(a.ts)
}

function outageEventRowKey(row: DeviceEventFeedRow): string {
  return `${row.deviceId}|${row.eventType}|${row.ts}`
}

function mergeOutageEventRows(
  existing: DeviceEventFeedRow[],
  incoming: DeviceEventFeedRow[]
): DeviceEventFeedRow[] {
  const byKey = new Map<string, DeviceEventFeedRow>()
  for (const row of existing) byKey.set(outageEventRowKey(row), row)
  for (const row of incoming) byKey.set(outageEventRowKey(row), row)
  return Array.from(byKey.values()).sort(compareOutageModalRows)
}

const OUTAGE_SEVERITY_SECTION_ORDER = [
  "CRITICAL",
  "WARNING",
  "INFO",
  "UNKNOWN",
] as const

function outageSeveritySection(severity: string): (typeof OUTAGE_SEVERITY_SECTION_ORDER)[number] {
  const x = severity.toUpperCase()
  if (x === "CRITICAL" || x === "ERROR") return "CRITICAL"
  if (x === "WARNING" || x === "WARN") return "WARNING"
  if (x === "INFO") return "INFO"
  return "UNKNOWN"
}

function isDeviceEventsStompDestination(destination?: string): boolean {
  const d = (destination ?? "").trim()
  return d === "/robot/device/events" || d.endsWith("/robot/device/events")
}

function isOfflineStompDestination(destination?: string): boolean {
  const d = (destination ?? "").trim()
  return d === "/robot/device/offline" || d.endsWith("/robot/device/offline")
}

function fleetDeviceStub(id: string, status: DeviceStatus): Device {
  return {
    id,
    name: id,
    site: "",
    model: "",
    status,
    battery: 0,
    temperature: 0,
    lastSeenMinutes: 0,
    emergency: false,
    errorRate: 0,
  }
}

export default function RoboticsMonitoringDashboard(
  incoming: Partial<RoboticsMonitoringDashboardProps> = {}
) {
  const props: RoboticsMonitoringDashboardProps = {
    ...roboticsMonitoringDashboardDefaults,
    ...incoming,
    devices: incoming.devices ?? roboticsMonitoringDashboardDefaults.devices,
  }

  const {
    title,
    subtitle,
    language,
    enableChat,
    chatTitle,
    chatPlaceholder,
    groupBySite,
    enableRealtimeSimulation,
    refreshMs,
    filterOffline,
    filterLowBattery,
    filterAbnormalTemp,
    filterEmergency,
    lowBatteryThreshold,
    abnormalTempThreshold,
    background,
    panelBackground,
    cardBackground,
    borderColor,
    textPrimary,
    textSecondary,
    statusOnline,
    statusOffline,
    statusWarning,
    statusError,
    statusMaintenance,
    accent,
    headingFont,
    bodyFont,
    monoFont,
    showKPIs,
    showDetailPanel,
    style,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useElementInView(containerRef, { amount: 0.2 })

  const [selectedId, setSelectedId] = useState<string>("")
  const [modalOpen, setModalOpen] = useState(false)
  const [fleetModalOpen, setFleetModalOpen] = useState(false)
  const [onlineOfflineModalOpen, setOnlineOfflineModalOpen] = useState(false)
  const [outageModalOpen, setOutageModalOpen] = useState(false)
  const [outageModalEventRows, setOutageModalEventRows] = useState<DeviceEventFeedRow[]>(
    []
  )
  const [outageModalLoading, setOutageModalLoading] = useState(false)
  const [outageModalError, setOutageModalError] = useState<string | null>(null)
  const [outageSeverityTab, setOutageSeverityTab] = useState<
    (typeof OUTAGE_SEVERITY_SECTION_ORDER)[number]
  >("CRITICAL")
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [selectedOutageEvent, setSelectedOutageEvent] = useState<DeviceEventFeedRow | null>(
    null
  )
  const [eventAckByKey, setEventAckByKey] = useState<Record<string, EventDetailAckState>>(
    () => loadEventAckMap()
  )
  const outageModalOpenRef = useRef(false)
  const eventDetailOpenRef = useRef(false)
  const [throughputModalOpen, setThroughputModalOpen] = useState(false)
  const [uptimeModalOpen, setUptimeModalOpen] = useState(false)
  const [uptimeFilter, setUptimeFilter] = useState<
    "all" | "normal" | "caution" | "warning"
  >("all")
  const [utilizationDevices, setUtilizationDevices] = useState<DeviceUtilization[]>([])
  const [utilizationLoading, setUtilizationLoading] = useState(false)
  const [utilizationError, setUtilizationError] = useState<string | null>(null)
  /** GET /v1/dashboard/device-list — 총 장비 KPI 및 플릿 모달 ID 목록 */
  const [dashboardDeviceIds, setDashboardDeviceIds] = useState<string[]>([])
  const [dashboardDeviceListReady, setDashboardDeviceListReady] = useState(false)
  const [dashboardDeviceListLoading, setDashboardDeviceListLoading] = useState(true)
  const [dashboardDeviceListError, setDashboardDeviceListError] = useState<
    string | null
  >(null)
  /** device-list + offline 초기 로드 완료 — 온라인/오프라인 KPI 표시 전 */
  const [dashboardOfflineBootstrapped, setDashboardOfflineBootstrapped] =
    useState(false)
  /** GET /v1/dashboard/all-events — CRITICAL만 장애 KPI·모달 초기값 */
  const [dashboardCriticalOutageRows, setDashboardCriticalOutageRows] = useState<
    DeviceEventFeedRow[]
  >([])
  const [dashboardAllEventsBootstrapped, setDashboardAllEventsBootstrapped] =
    useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [rightTab, setRightTab] = useState<"fleetMap" | "insights" | "chat">("fleetMap")
  const [mapIndicatorMode, setMapIndicatorMode] = useState<
    "default" | "mission" | "eventType"
  >("default")
  const [fleetHoverMenu, setFleetHoverMenu] = useState<"mission" | "event" | null>(null)
  const [selectedMissionFilter, setSelectedMissionFilter] = useState<string>("ALL")
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] = useState<string>("ALL")
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string; ts: string }[]
  >(() => {
    const now = new Date()
    const ts = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    return [
      {
        role: "assistant",
        ts,
        text:
          language === "ko"
            ? "안녕하세요. 로봇 운영 데이터를 요약/분석하려면 질문을 입력하세요."
            : "Hi. Ask for summaries or analysis of robot operations data.",
      },
    ]
  })
  const search = ""
  const [tick, setTick] = useState(0)
  const [liveDevices, setLiveDevices] = useState<Device[] | null>(null)
  const [deviceEvents, setDeviceEvents] = useState<Record<string, BackendDeviceEvent[]>>({})
  const [throughputData, setThroughputData] = useState<BackendThroughputResponse | null>(null)
  /** /robot/device/totalUtilization — TotalUtilizationResponse.totalUtilization */
  const [wsTotalUtilization, setWsTotalUtilization] = useState<number | null>(null)
  /** deviceId 누적 — /robot/device/offline 웹소켓 수신 시마다 병합 */
  const [wsOfflineDeviceIds, setWsOfflineDeviceIds] = useState<string[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [lastWsMessageAt, setLastWsMessageAt] = useState<string>("")
  const socketRef = useRef<WebSocket | null>(null)
  const fleetHoverCloseTimerRef = useRef<number | null>(null)
  const deviceSource = useMemo(() => liveDevices ?? [], [liveDevices])

  const applyOfflineDeviceIds = useCallback(
    (ids: Iterable<string>, mode: "merge" | "replace" = "merge") => {
      const offlineIds = new Set<string>()
      for (const id of ids) {
        if (typeof id === "string" && id.trim()) offlineIds.add(id.trim())
      }
      if (mode === "merge" && offlineIds.size === 0) return

      startTransition(() => {
        setWsOfflineDeviceIds((prev) => {
          const s =
            mode === "replace" ? offlineIds : new Set([...prev, ...offlineIds])
          return Array.from(s).sort((a, b) => a.localeCompare(b))
        })
        setLiveDevices((prev) => {
          const base = prev ?? []
          if (!base.length) return base
          const byId = new Map(base.map((d) => [d.id, d]))
          const now = new Date().toISOString()
          for (const id of offlineIds) {
            const old = byId.get(id)
            if (!old) continue
            byId.set(id, {
              ...old,
              status: "Offline",
              lastSeenMinutes: Math.max(old.lastSeenMinutes ?? 0, 1),
              lastSeenAt: now,
              updatedAt: now,
            })
          }
          return Array.from(byId.values())
        })
      })
    },
    []
  )

  useEffect(() => {
    outageModalOpenRef.current = outageModalOpen
  }, [outageModalOpen])

  useEffect(() => {
    eventDetailOpenRef.current = eventDetailOpen
  }, [eventDetailOpen])

  useEffect(() => {
    const socket = createSocket((payload, meta) => {
      setLastWsMessageAt(new Date().toISOString())

      const mapped = telemetryBatchToDevices(payload)
      if (mapped.length) {
        startTransition(() =>
          setLiveDevices((prev) => {
            const base = prev ?? []
            const byId = new Map(base.map((d) => [d.id, d]))
            for (const next of mapped) {
              const prevOne = byId.get(next.id)
              byId.set(next.id, prevOne ? { ...prevOne, ...next } : next)
            }
            return Array.from(byId.values())
          })
        )
      }

      const events = eventBatchFromPayload(payload)
      if (events.length) {
        startTransition(() =>
          setDeviceEvents((prev) => {
            const next = { ...prev }
            for (const ev of events) {
              const deviceId = resolveEventDeviceId(ev)
              if (!deviceId) continue
              const list = next[deviceId] ?? []
              next[deviceId] = [...list, ev].slice(-30)
            }
            return next
          })
        )
        startTransition(() =>
          setLiveDevices((prev) => {
            const base = prev ?? []
            if (!base.length) return base
            const byId = new Map(base.map((d) => [d.id, d]))
            for (const ev of events) {
              const deviceId = resolveEventDeviceId(ev)
              if (!deviceId) continue
              const old = byId.get(deviceId)
              if (!old) continue
              byId.set(deviceId, {
                ...old,
                lastEventType: ev.eventType,
                lastEventSeverity: ev.severity,
              })
            }
            return Array.from(byId.values())
          })
        )
      }

      if (
        isDeviceEventsStompDestination(meta?.destination) &&
        (outageModalOpenRef.current || eventDetailOpenRef.current)
      ) {
        const feedRows = deviceEventsFeedFromPayload(payload)
        if (feedRows.length) {
          if (outageModalOpenRef.current) {
            startTransition(() =>
              setOutageModalEventRows((prev) => mergeOutageEventRows(prev, feedRows))
            )
          }
          if (eventDetailOpenRef.current) {
            startTransition(() =>
              setDeviceEvents((prev) => {
                const next = { ...prev }
                for (const row of feedRows) {
                  const list = next[row.deviceId] ?? []
                  const pseudo: BackendDeviceEvent = {
                    id: null,
                    deviceId: row.deviceId,
                    eventType: row.eventType,
                    severity: row.severity,
                    createdAt: row.ts,
                  }
                  next[row.deviceId] = [...list, pseudo].slice(-30)
                }
                return next
              })
            )
          }
        }
      }

      const throughput = throughputFromPayload(payload)
      if (throughput) {
        startTransition(() => setThroughputData(throughput))
      }

      const totalUtil = totalUtilizationFromPayload(payload)
      if (totalUtil !== null) {
        startTransition(() => setWsTotalUtilization(totalUtil))
      }

      if (isOfflineStompDestination(meta?.destination)) {
        const offlineEvents = offlineEventBatchFromPayload(payload)
        if (offlineEvents.length) {
          applyOfflineDeviceIds(
            offlineEvents.map((e) => e.deviceId),
            "merge"
          )
        }
      }
    })
    socketRef.current = socket

    const handleOpen = () => {
      setWsConnected(true)
    }
    const handleClose = () => {
      setWsConnected(false)
    }
    socket.addEventListener("open", handleOpen)
    socket.addEventListener("close", handleClose)

    return () => {
      socket.removeEventListener("open", handleOpen)
      socket.removeEventListener("close", handleClose)
      socket.close()
      socketRef.current = null
      setWsConnected(false)
    }
  }, [])

  const ui = useMemo(() => {
    const ko = language === "ko"
    return {
      copilotTitle: ko ? "관제 코파일럿" : "Ops Copilot",
      copilotSubtitle: ko
        ? "요약 · 통계 · 이상탐지 · 질의응답"
        : "Summaries · Statistics · Anomaly detection · Q&A",
      tabFleetMap: ko ? "전체 장비 위치" : "Fleet Positions",
      tabInsights: ko ? "인사이트" : "Insights",
      tabChat: "Daisy Assistant",
      mapTagDefault: ko ? "기본" : "Default",
      mapTagMission: ko ? "상태" : "Status",
      mapTagEvent: ko ? "이벤트" : "Event",
      mapFilterAll: ko ? "전체" : "All",
      quickActions: ko ? "빠른 질문" : "Quick actions",
      qaFleetSummary: ko ? "플릿 요약" : "Fleet summary",
      qaTopRisks: ko ? "리스크 상위" : "Top risks",
      qaOfflineList: ko ? "오프라인 목록" : "Offline list",
      qaHotList: ko ? "고온 목록" : "Hot list",
      qaLowBatteryList: ko ? "저전력 목록" : "Low battery list",
      insightsOverview: ko ? "관제 인사이트" : "Monitoring insights",
      insightsAnomalies: ko ? "이상 징후" : "Anomalies",
      insightsNoAnomaly: ko
        ? "현재 감지된 이상이 없습니다."
        : "No anomalies detected right now.",
      kpiTotal: ko ? "총 장비" : "Total Devices",
      kpiOnlineOffline: ko ? "온라인 / 오프라인" : "Online / Offline",
      kpiAvgBattery: ko ? "고온 장비 수" : "Hot Devices",
      kpiAvgTemp: ko ? "생산량" : "Production",
      kpiErrorRate: ko ? "장애" : "Outage",
      outageModalLoading: ko
        ? "이벤트 목록 불러오는 중…"
        : "Loading events…",
      outageModalLoadError: ko
        ? "이벤트 목록을 불러오지 못했습니다."
        : "Could not load events.",
      outageSeverityCritical: ko ? "치명 (CRITICAL)" : "Critical",
      outageSeverityWarning: ko ? "경고 (WARNING)" : "Warning",
      outageSeverityInfo: ko ? "정보 (INFO)" : "Info",
      outageSeverityUnknown: ko ? "기타 (UNKNOWN)" : "Unknown",
      outageColDevice: ko ? "장비" : "Device",
      outageColEvent: ko ? "이벤트" : "Event",
      outageColSeverity: ko ? "강도" : "Severity",
      outageColTime: ko ? "발생시간" : "Time",
      outageEmptyTab: ko
        ? "해당 강도의 이벤트가 없습니다."
        : "No events for this severity.",
      kpiEmergency: ko ? "가동률" : "Uptime",
      uptimeTitle: ko ? "기기별 가동률" : "Device Uptime",
      uptimeAll: ko ? "전체" : "All",
      uptimeNormal: ko ? "정상" : "Normal",
      uptimeCaution: ko ? "주의" : "Caution",
      uptimeWarning: ko ? "경고" : "Warning",
      uptimeEmpty: ko
        ? "표시할 기기가 없습니다."
        : "No devices to display.",
      uptimeLoading: ko ? "가동률 데이터 불러오는 중…" : "Loading utilization…",
      hintAllUnits: ko ? "등록된 전체 장비" : "All registered units",
      fleetDeviceListLoading: ko
        ? "장비 목록 불러오는 중…"
        : "Loading device list…",
      fleetDeviceListEmpty: ko
        ? "등록된 장비 ID가 없습니다."
        : "No device IDs in the response.",
      fleetDeviceListApiError: ko
        ? "장비 목록 API를 불러오지 못했습니다. 아래는 실시간 플릿 기준입니다."
        : "Could not load device list API. Showing live fleet below.",
      hintRolling: ko ? "최근 15분" : "Rolling 15m",
      filtersLabel: ko ? "필터" : "Filters",
      filterOffline: ko ? "오프라인" : "Offline",
      filterLowBattery: ko ? "저전력" : "Low battery",
      filterHot: ko ? "고온" : "Hot",
      hotDeviceCount: ko ? "고온 장비 수" : "Hot Device Count",
      filterEmergency: ko ? "긴급" : "Emergency",
      showing: ko ? "표시" : "Showing",
      of: ko ? " / " : " of ",
      searchPlaceholder: ko
        ? "장비, 사이트, 모델, 상태 검색…"
        : "Search devices, sites, model, status…",
      clear: ko ? "지우기" : "Clear",
      fleetOverview: ko ? "플릿 개요" : "Fleet Overview",
      fleetMapTitle: ko ? "전체 장비 위치" : "Fleet Positions",
      fleetMapHint: ko ? "x / y / theta 기반 실시간 배치" : "Live layout from x / y / theta",
      noPoseData: ko ? "좌표 데이터 없음" : "No pose data",
      hiddenNoPose: ko ? "좌표 미보유" : "No pose",
      groupedBySite: ko ? "사이트별 그룹" : "Grouped by site",
      flatList: ko ? "단일 목록" : "Flat list",
      selectRow: ko
        ? "• 행을 선택하면 상세를 볼 수 있어요"
        : "• Select a row to inspect",
      noMatch: ko
        ? "현재 필터에 해당하는 장비가 없습니다."
        : "No devices match the current filters.",
      device: ko ? "장비" : "Device",
      status: ko ? "상태" : "Status",
      battery: ko ? "배터리" : "Battery",
      temp: ko ? "온도" : "Temp",
      errors: ko ? "에러" : "Errors",
      lastSeen: ko ? "마지막 접속시간" : "Last seen",
      now: ko ? "지금" : "Now",
      detailPanel: ko ? "장비 상세" : "Device detail",
      recentLogs: ko ? "최근 로그" : "Recent Logs",
      live: ko ? "실시간" : "Live",
      snapshot: ko ? "스냅샷" : "Snapshot",
      close: ko ? "닫기" : "Close",
      onlineOfflineModalTitle: ko
        ? "온라인 / 오프라인 장비 목록"
        : "Online / offline devices",
      onlineOfflineOfflineLabel: ko ? "오프라인 감지" : "Offline detection",
      robotId: ko ? "로봇 ID" : "Robot ID",
      model: ko ? "모델" : "Model",
      currentLocation: ko ? "현재 위치" : "Current location",
      sensorStatus: ko ? "센서 상태" : "Sensor status",
      batteryGauge: ko ? "배터리 게이지" : "Battery gauge",
      batteryHistory: ko ? "최근 배터리/온도" : "Recent battery & temperature",
      lastApprox: ko ? "최근 ~25분" : "Last ~25m",
      chat: ko ? "채팅" : "Chat",
      send: ko ? "전송" : "Send",
    }
  }, [language])

  useEffect(() => {
    if (!selectedId) {
      const first = deviceSource?.[0]?.id ?? ""
      if (first) startTransition(() => setSelectedId(first))
    }
    if (selectedId && deviceSource?.length) {
      const exists = deviceSource.some((d) => d.id === selectedId)
      if (!exists) startTransition(() => setSelectedId(deviceSource[0].id))
    }
  }, [deviceSource, selectedId])

  useEffect(() => {
    if (isStatic) return
    if (!enableRealtimeSimulation) return
    if (!inView) return

    const ms = clamp(refreshMs, 250, 5000)
    const id = window.setInterval(() => {
      startTransition(() => setTick((t) => t + 1))
    }, ms)

    return () => window.clearInterval(id)
  }, [enableRealtimeSimulation, refreshMs, inView])

  const derivedDevices = useMemo(() => {
    if (!enableRealtimeSimulation || isStatic) return deviceSource

    const t = tick
    return deviceSource.map((d, idx) => {
      const w1 = ((t + idx * 7) % 21) - 10
      const w2 = ((t + idx * 11) % 9) - 4

      let battery = clamp(
        d.battery - (t % 3 === 0 ? 1 : 0) + (idx % 8 === 0 ? 1 : 0),
        0,
        100
      )
      battery = clamp(battery + Math.sign(w2), 0, 100)

      const temperature = clamp(d.temperature + w2 * 0.35, -10, 110)
      const errorRate = clamp(d.errorRate + w1 * 0.02, 0, 100)

      let status: DeviceStatus = d.status
      if (d.emergency) status = "Error"
      else if (status === "Offline") status = "Offline"
      else if (
        temperature >= abnormalTempThreshold + 10 ||
        errorRate >= 6
      )
        status = "Error"
      else if (
        temperature >= abnormalTempThreshold ||
        battery <= lowBatteryThreshold ||
        errorRate >= 2.5
      )
        status = "Warning"
      else if (status === "Maintenance") status = "Maintenance"
      else status = "Online"

      const lastSeenMinutes =
        status === "Offline"
          ? clamp(d.lastSeenMinutes + 1, 0, 9999)
          : clamp(d.lastSeenMinutes - 1, 0, 9999)

      return {
        ...d,
        battery,
        temperature,
        errorRate,
        status,
        lastSeenMinutes,
      }
    })
  }, [
    deviceSource,
    tick,
    enableRealtimeSimulation,
    abnormalTempThreshold,
    lowBatteryThreshold,
  ])

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return derivedDevices.filter((d) => {
      if (q) {
        const hay =
          `${d.id} ${d.name} ${d.site} ${d.model} ${d.status}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterOffline && d.status !== "Offline") return false
      if (filterLowBattery && d.battery > lowBatteryThreshold) return false
      if (filterAbnormalTemp && d.temperature < abnormalTempThreshold)
        return false
      if (filterEmergency && !d.emergency) return false
      return true
    })
  }, [
    derivedDevices,
    search,
    filterOffline,
    filterLowBattery,
    filterAbnormalTemp,
    filterEmergency,
    lowBatteryThreshold,
    abnormalTempThreshold,
  ])

  const selected = useMemo(() => {
    const found = derivedDevices.find((d) => d.id === selectedId)
    return found ?? filteredDevices[0] ?? derivedDevices[0] ?? null
  }, [derivedDevices, filteredDevices, selectedId])

  useEffect(() => {
    if (!selected) return
    if (selectedId !== selected.id)
      startTransition(() => setSelectedId(selected.id))
  }, [selected, selectedId])

  const kpis = useMemo(() => {
    const total = derivedDevices.length
    const offlineSet = new Set(wsOfflineDeviceIds)
    const offlineInFleet = derivedDevices.filter((d) =>
      offlineSet.has(d.id)
    ).length
    const wsOnlyOffline = wsOfflineDeviceIds.filter(
      (id) => !derivedDevices.some((d) => d.id === id)
    ).length
    const offline = offlineInFleet + wsOnlyOffline
    const online = Math.max(0, total - offlineInFleet)
    const warning = derivedDevices.filter(
      (d) => d.status === "Warning"
    ).length
    const error = derivedDevices.filter((d) => d.status === "Error").length
    const maintenance = derivedDevices.filter(
      (d) => d.status === "Maintenance"
    ).length
    const avgBattery = total
      ? derivedDevices.reduce((s, d) => s + d.battery, 0) / total
      : 0
    const avgTemp = total
      ? derivedDevices.reduce((s, d) => s + d.temperature, 0) / total
      : 0
    const avgErrorRate = total
      ? derivedDevices.reduce((s, d) => s + d.errorRate, 0) / total
      : 0
    const emergencies = derivedDevices.filter((d) => d.emergency).length
    const hotDevices = derivedDevices.filter(
      (d) => d.temperature >= abnormalTempThreshold
    ).length
    const production = derivedDevices.filter((d) => {
      const mission = (d.mission ?? "").trim().toUpperCase()
      return mission === "PICK" || mission === "PACK"
    }).length

    return {
      total,
      online,
      offline,
      warning,
      error,
      maintenance,
      avgBattery,
      avgTemp,
      avgErrorRate,
      emergencies,
      hotDevices,
      production,
    }
  }, [abnormalTempThreshold, derivedDevices, wsOfflineDeviceIds])

  const kpiTotalDevicesDisplay = useMemo(() => {
    if (dashboardDeviceListLoading) return "…"
    if (dashboardDeviceListReady) return String(dashboardDeviceIds.length)
    return String(kpis.total)
  }, [
    dashboardDeviceListLoading,
    dashboardDeviceListReady,
    dashboardDeviceIds.length,
    kpis.total,
  ])

  const activeSummary = useMemo(() => {
    const total = derivedDevices.length
    if (!total) return "0/0"
    const active = derivedDevices.filter((d) => d.status !== "Offline")
      .length
    return `${active}/${total}`
  }, [derivedDevices])

  const statusColor = useCallback(
    (s: DeviceStatus) => {
      switch (s) {
        case "Online":
          return statusOnline
        case "Offline":
          return statusOffline
        case "Warning":
          return statusWarning
        case "Error":
          return statusError
        case "Maintenance":
          return statusMaintenance
        default:
          return textSecondary
      }
    },
    [
      statusOnline,
      statusOffline,
      statusWarning,
      statusError,
      statusMaintenance,
      textSecondary,
    ]
  )

  const statusPill = useCallback(
    (s: DeviceStatus) => {
      const c = statusColor(s)
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            background: withAlpha(c, 0.12),
            color: c,
            border: `1px solid ${withAlpha(c, 0.25)}`,
            ...monoFont,
            fontSize: coerceFontSize(monoFont?.fontSize, 12),
            lineHeight: monoFont?.lineHeight ?? "1em",
            letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
            whiteSpace: "nowrap",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: c,
              boxShadow: `0 0 0 3px ${withAlpha(c, 0.12)}`,
            }}
          />
          {s}
        </span>
      )
    },
    [monoFont, statusColor]
  )

  const groups = useMemo(() => {
    if (!groupBySite) return null
    const bySite = new Map<string, Device[]>()
    for (const d of filteredDevices) {
      const key = d.site || "Unassigned"
      const list = bySite.get(key) ?? []
      list.push(d)
      bySite.set(key, list)
    }
    const sites = Array.from(bySite.keys()).sort((a, b) =>
      a.localeCompare(b)
    )
    return sites.map((site) => ({
      site,
      devices: (bySite.get(site) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
  }, [groupBySite, filteredDevices])

  const fleetPose = useMemo(() => {
    const withPose = derivedDevices
      .filter(
        (d) =>
          typeof d.posX === "number" &&
          Number.isFinite(d.posX) &&
          typeof d.posY === "number" &&
          Number.isFinite(d.posY)
      )
      .map((d) => ({
        id: d.id,
        x: d.posX as number,
        y: d.posY as number,
        theta: typeof d.theta === "number" && Number.isFinite(d.theta) ? d.theta : 0,
        status: d.status,
      }))

    if (!withPose.length) {
      return { points: [] as typeof withPose, hiddenCount: derivedDevices.length, bounds: null as null | { minX: number; maxX: number; minY: number; maxY: number } }
    }

    let minX = withPose[0].x
    let maxX = withPose[0].x
    let minY = withPose[0].y
    let maxY = withPose[0].y
    for (const p of withPose) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }

    const spanX = Math.max(1, maxX - minX)
    const spanY = Math.max(1, maxY - minY)
    const pad = 0.08
    const paddedBounds = {
      minX: minX - spanX * pad,
      maxX: maxX + spanX * pad,
      minY: minY - spanY * pad,
      maxY: maxY + spanY * pad,
    }

    return {
      points: withPose,
      hiddenCount: Math.max(0, derivedDevices.length - withPose.length),
      bounds: paddedBounds,
    }
  }, [derivedDevices])

  const derivedDeviceById = useMemo(
    () => new Map(derivedDevices.map((d) => [d.id, d])),
    [derivedDevices]
  )
  const missionFilterOptions = useMemo(() => {
    const set = new Set<string>()
    for (const d of derivedDevices) {
      const mission = d.mission?.trim()
      if (mission) set.add(mission)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [derivedDevices])
  const eventTypeFilterOptions = useMemo(() => {
    const set = new Set<string>()
    for (const d of derivedDevices) {
      const ev = d.lastEventType?.trim()
      if (ev) set.add(ev)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [derivedDevices])

  const getEventSeverityColor = useCallback(
    (severity: string | undefined) => {
      const s = (severity ?? "").toUpperCase()
      if (s === "CRITICAL" || s === "ERROR") return "#EF4444"
      if (s === "WARN" || s === "WARNING") return "#F59E0B"
      if (s === "INFO") return "#3B82F6"
      return textSecondary
    },
    [textSecondary]
  )

  const onSelect = useCallback((id: string) => {
    startTransition(() => {
      setSelectedId(id)
      setModalOpen(true)
    })
  }, [])

  const eventDetailDevice = useMemo(() => {
    if (!selectedOutageEvent) return null
    const live = derivedDevices.find((d) => d.id === selectedOutageEvent.deviceId)
    if (live) return live
    const offline = wsOfflineDeviceIds.includes(selectedOutageEvent.deviceId)
    return fleetDeviceStub(
      selectedOutageEvent.deviceId,
      offline ? "Offline" : "Online"
    )
  }, [selectedOutageEvent, derivedDevices, wsOfflineDeviceIds])

  const selectedEventAck = useMemo(() => {
    if (!selectedOutageEvent) return defaultAckState()
    const key = outageEventRowKey(selectedOutageEvent)
    return eventAckByKey[key] ?? defaultAckState()
  }, [selectedOutageEvent, eventAckByKey])

  const handleEventAck = useCallback(
    (assignee: string) => {
      if (!selectedOutageEvent) return
      const key = outageEventRowKey(selectedOutageEvent)
      const now = new Date().toISOString()
      setEventAckByKey((prev) => {
        const next = {
          ...prev,
          [key]: {
            acknowledged: true,
            assignee,
            acknowledgedAt: now,
            resolved: prev[key]?.resolved ?? false,
            resolvedAt: prev[key]?.resolvedAt ?? "",
          },
        }
        saveEventAckMap(next)
        return next
      })
    },
    [selectedOutageEvent]
  )

  const handleEventResolve = useCallback(() => {
    if (!selectedOutageEvent) return
    const key = outageEventRowKey(selectedOutageEvent)
    const now = new Date().toISOString()
    setEventAckByKey((prev) => {
      const existing = prev[key] ?? defaultAckState()
      const next = {
        ...prev,
        [key]: {
          ...existing,
          acknowledged: true,
          acknowledgedAt: existing.acknowledgedAt || now,
          assignee: existing.assignee || "—",
          resolved: true,
          resolvedAt: now,
        },
      }
      saveEventAckMap(next)
      return next
    })
  }, [selectedOutageEvent])

  const closeModal = useCallback(() => {
    startTransition(() => setModalOpen(false))
  }, [])

  const openFleetModal = useCallback(() => {
    startTransition(() => setFleetModalOpen(true))
  }, [])

  const closeFleetModal = useCallback(() => {
    startTransition(() => setFleetModalOpen(false))
  }, [])

  const openOnlineOfflineModal = useCallback(() => {
    startTransition(() => setOnlineOfflineModalOpen(true))
  }, [])

  const closeOnlineOfflineModal = useCallback(() => {
    startTransition(() => setOnlineOfflineModalOpen(false))
  }, [])

  const openOutageModal = useCallback(() => {
    startTransition(() => {
      setOutageSeverityTab("CRITICAL")
      setOutageModalOpen(true)
    })
  }, [])

  const closeOutageModal = useCallback(() => {
    startTransition(() => setOutageModalOpen(false))
  }, [])

  const openEventDetail = useCallback((row: DeviceEventFeedRow) => {
    startTransition(() => {
      setSelectedOutageEvent(row)
      setEventDetailOpen(true)
    })
  }, [])

  const closeEventDetail = useCallback(() => {
    startTransition(() => {
      setEventDetailOpen(false)
      setSelectedOutageEvent(null)
    })
  }, [])

  const handleViewDeviceFromEvent = useCallback(() => {
    if (!selectedOutageEvent) return
    onSelect(selectedOutageEvent.deviceId)
    closeEventDetail()
  }, [selectedOutageEvent, onSelect, closeEventDetail])

  const openThroughputModal = useCallback(() => {
    startTransition(() => setThroughputModalOpen(true))
  }, [])

  const closeThroughputModal = useCallback(() => {
    startTransition(() => setThroughputModalOpen(false))
  }, [])

  const openUptimeModal = useCallback(() => {
    startTransition(() => {
      setUptimeModalOpen(true)
      setUptimeFilter("all")
    })
  }, [])

  const closeUptimeModal = useCallback(() => {
    startTransition(() => setUptimeModalOpen(false))
  }, [])

  const closeChat = useCallback(() => {
    startTransition(() => setChatOpen(false))
  }, [])

  const sendChat = useCallback(() => {
    const text = chatInput.trim()
    if (!text) return
    const now = new Date()
    const ts = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    startTransition(() => {
      setChatMessages((m) => [...m, { role: "user", text, ts }])
      setChatInput("")
    })

    const reply =
      language === "ko"
        ? "(데모) 오프라인 장비 요약, 에러율 상위 장비 등 질문에 답할 수 있어요."
        : "(Demo) Try asking for offline summaries or top error-rate units."

    const ts2 = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    window.setTimeout(() => {
      startTransition(() => {
        setChatMessages((m) => [
          ...m,
          { role: "assistant", text: reply, ts: ts2 },
        ])
      })
    }, 250)
  }, [chatInput, language])

  const copilotInsights = useMemo(() => {
    const HOT_TEMP_C = 90
    const total = derivedDevices.length
    const offline = derivedDevices.filter((d) => d.status === "Offline").length
    const low = derivedDevices.filter((d) => d.battery <= lowBatteryThreshold).length
    const hot = derivedDevices.filter((d) => d.temperature > HOT_TEMP_C).length
    const emergency = derivedDevices.filter((d) => d.emergency).length

    const anomalies = derivedDevices
      .filter((d) => {
        return (
          d.emergency ||
          d.status === "Offline" ||
          d.battery <= lowBatteryThreshold ||
          d.temperature >= abnormalTempThreshold
        )
      })
      .map((d) => {
        const reasons: string[] = []
        if (d.emergency) reasons.push("E-STOP")
        if (d.status === "Offline") reasons.push("OFFLINE")
        if (d.battery <= lowBatteryThreshold) reasons.push("LOW_BAT")
        if (d.temperature >= abnormalTempThreshold) reasons.push("HOT")
        const score =
          (d.emergency ? 100 : 0) +
          (d.status === "Offline" ? 40 : 0) +
          (d.temperature >= abnormalTempThreshold ? 25 : 0) +
          (d.battery <= lowBatteryThreshold ? 20 : 0)
        return { id: d.id, site: d.site, reasons, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)

    return { total, offline, low, hot, emergency, anomalies }
  }, [abnormalTempThreshold, derivedDevices, lowBatteryThreshold])

  const renderTable = useDeviceTableRenderer({
    abnormalTempThreshold,
    accent,
    borderColor,
    bodyFont,
    cardBackground,
    lowBatteryThreshold,
    monoFont,
    onSelect,
    panelBackground,
    selectedId,
    statusError,
    statusWarning,
    textPrimary,
    textSecondary,
    ui: ui as Record<string, string>,
  })

  const logs = useMemo(() => {
    if (!selected) return []

    const events = [...(deviceEvents[selected.id] ?? [])]
    events.sort((a, b) => {
      const ta = Date.parse(a.payload?.ts ?? a.createdAt ?? "")
      const tb = Date.parse(b.payload?.ts ?? b.createdAt ?? "")
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
    })

    return events.slice(0, 8).map((ev) => {
      const severity = (ev.severity ?? "").toUpperCase()
      const ts = ev.payload?.ts ?? ev.createdAt ?? ""
      const stamp = formatKoreanRelativeTime(ts).replace(" 전", "전")
      const payloadText = ev.payload ? JSON.stringify(ev.payload) : "{}"
      return {
        t: ev.eventType ?? "UNKNOWN",
        msg: payloadText,
        stamp,
        sev:
          severity === "CRITICAL" || severity === "ERROR"
            ? ("error" as const)
            : severity === "WARN" || severity === "WARNING"
              ? ("warn" as const)
              : ("info" as const),
      }
    })
  }, [selected, deviceEvents])

  const currentLocation = useMemo(() => {
    if (!selected) return ""
    const hasPos =
      typeof selected.posX === "number" &&
      typeof selected.posY === "number" &&
      typeof selected.theta === "number"
    const mapId = selected.mapId ?? selected.site ?? "N/A"
    if (hasPos) {
      return `${mapId} • x:${selected.posX!.toFixed(2)} • y:${selected.posY!.toFixed(2)} • theta:${selected.theta!.toFixed(2)}`
    }
    return `${mapId} • x:- • y:- • theta:-`
  }, [selected])

  const sensorIndicators = useMemo(() => {
    if (!selected)
      return [] as {
        label: string
        state: "ok" | "warn" | "error"
        detail: string
      }[]
    const speed = selected.speedMps ?? 0
    const cpu = selected.cpuPct ?? 0
    const mem = selected.memPct ?? 0
    const lastSeenRelative = formatKoreanRelativeTime(
      selected.updatedAt ?? selected.lastSeenAt
    ).replace(" 전", "전")

    return [
      {
        label: "Speed",
        state: selected.status === "Offline" ? "error" : speed <= 0.01 ? "warn" : "ok",
        detail: `${speed.toFixed(2)} m/s`,
      },
      {
        label: "CPU",
        state: cpu >= 90 ? "error" : cpu >= 75 ? "warn" : "ok",
        detail: `${cpu.toFixed(1)}%`,
      },
      {
        label: "Memory",
        state: mem >= 90 ? "error" : mem >= 75 ? "warn" : "ok",
        detail: `${mem.toFixed(1)}%`,
      },
      {
        label: "마지막 접속시간",
        state: selected.status === "Offline" ? "error" : "ok",
        detail: lastSeenRelative,
      },
    ]
  }, [selected])

  const batterySeries = useMemo(() => {
    if (!selected) return [] as number[]
    const n = 26
    const base = clamp(selected.battery, 0, 100)
    const series: number[] = []
    for (let i = 0; i < n; i++) {
      const wobble = ((tick + i * 7 + selected.id.length * 3) % 17) - 8
      const trend = (i - (n - 1)) * 0.22
      const v = clamp(base + wobble * 0.6 + trend, 0, 100)
      series.push(v)
    }
    return series
  }, [selected, tick])

  const tempSeries = useMemo(() => {
    if (!selected) return [] as number[]
    const n = 26
    const base = selected.temperature
    const series: number[] = []
    for (let i = 0; i < n; i++) {
      const wobble = ((tick + i * 5 + selected.id.length * 11) % 13) - 6
      const trend = (i - (n - 1)) * 0.06
      series.push(base + wobble * 0.22 + trend)
    }
    return series
  }, [selected, tick])

  const sortedFleetDevices = useMemo(() => {
    return [...derivedDevices].sort((a, b) => {
      const mapA = (a.mapId ?? a.site ?? "").toLowerCase()
      const mapB = (b.mapId ?? b.site ?? "").toLowerCase()
      if (mapA !== mapB) return mapA.localeCompare(mapB)
      return a.id.localeCompare(b.id)
    })
  }, [derivedDevices])

  const fleetGroupsByMap = useMemo(() => {
    const grouped = new Map<string, Device[]>()
    for (const d of sortedFleetDevices) {
      const mapKey = d.mapId ?? d.site ?? "UNKNOWN-MAP"
      const list = grouped.get(mapKey) ?? []
      list.push(d)
      grouped.set(mapKey, list)
    }
    return Array.from(grouped.entries()).map(([mapId, devices]) => ({
      mapId,
      devices,
    }))
  }, [sortedFleetDevices])

  /** 등록 장비(device-list) ∩ offline API/WS — 총 장비 KPI와 동일 집합 기준 */
  const onlineOfflineApiCounts = useMemo(() => {
    if (!dashboardDeviceListReady) return null
    const offlineSet = new Set(wsOfflineDeviceIds)
    let offline = 0
    for (const id of dashboardDeviceIds) {
      if (offlineSet.has(id)) offline++
    }
    return {
      online: dashboardDeviceIds.length - offline,
      offline,
    }
  }, [dashboardDeviceListReady, dashboardDeviceIds, wsOfflineDeviceIds])

  const onlineOfflineLists = useMemo(() => {
    const offlineSet = new Set(wsOfflineDeviceIds)
    if (dashboardDeviceListReady) {
      const byId = new Map(sortedFleetDevices.map((d) => [d.id, d]))
      const online = dashboardDeviceIds
        .filter((id) => !offlineSet.has(id))
        .map((id) => byId.get(id) ?? fleetDeviceStub(id, "Online"))
      const offline = dashboardDeviceIds
        .filter((id) => offlineSet.has(id))
        .map((id) => byId.get(id) ?? fleetDeviceStub(id, "Offline"))
      return { online, offline }
    }
    return {
      online: sortedFleetDevices.filter((d) => !offlineSet.has(d.id)),
      offline: sortedFleetDevices.filter((d) => offlineSet.has(d.id)),
    }
  }, [
    dashboardDeviceListReady,
    dashboardDeviceIds,
    sortedFleetDevices,
    wsOfflineDeviceIds,
  ])

  /** 온라인/오프라인 KPI — (등록 총장비 − 오프라인) / 오프라인, API 로드 후 일괄 표시 */
  const kpiOnlineOfflineValue = useMemo(() => {
    if (dashboardDeviceListLoading || !dashboardOfflineBootstrapped) return "…"
    if (onlineOfflineApiCounts) {
      return `${onlineOfflineApiCounts.online} / ${onlineOfflineApiCounts.offline}`
    }
    return `${onlineOfflineLists.online.length} / ${onlineOfflineLists.offline.length}`
  }, [
    dashboardDeviceListLoading,
    dashboardOfflineBootstrapped,
    onlineOfflineApiCounts,
    onlineOfflineLists,
  ])

  const outageModalGroups = useMemo(() => {
    const buckets = new Map<string, DeviceEventFeedRow[]>()
    for (const key of OUTAGE_SEVERITY_SECTION_ORDER) buckets.set(key, [])
    for (const row of outageModalEventRows) {
      const section = outageSeveritySection(row.severity)
      buckets.get(section)!.push(row)
    }
    return OUTAGE_SEVERITY_SECTION_ORDER.map((severity) => ({
      severity,
      rows: (buckets.get(severity) ?? []).sort((a, b) =>
        b.ts.localeCompare(a.ts)
      ),
    }))
  }, [outageModalEventRows])

  const outageModalActiveRows = useMemo(() => {
    return (
      outageModalGroups.find((g) => g.severity === outageSeverityTab)?.rows ?? []
    )
  }, [outageModalGroups, outageSeverityTab])

  const kpiOutageValue = useMemo(() => {
    if (!dashboardAllEventsBootstrapped) return "…"
    return String(dashboardCriticalOutageRows.length)
  }, [dashboardAllEventsBootstrapped, dashboardCriticalOutageRows.length])

  const throughputChartPoints = useMemo(() => {
    const sortedChart = [...(throughputData?.chart ?? [])].sort((a, b) => {
      const ta = parseKoreanTimestampMs(a.time)
      const tb = parseKoreanTimestampMs(b.time)
      const aValid = Number.isFinite(ta)
      const bValid = Number.isFinite(tb)
      if (aValid && bValid) return ta - tb
      if (aValid) return -1
      if (bValid) return 1
      return a.time.localeCompare(b.time)
    })
    return sortedChart.map((p) => {
      const full = formatKoreanDateTime(p.time)
      const short = formatKoreanTime(p.time)
      const fallback = p.time || "-"
      return {
        time: full === "-" ? fallback : full,
        count: p.count,
        shortTime: short === "-" ? fallback : short,
      }
    })
  }, [throughputData])

  const throughputSeries = useMemo(() => {
    return throughputChartPoints.map((p) => p.count)
  }, [throughputChartPoints])

  const throughputStats = useMemo(() => {
    if (!throughputSeries.length) {
      return { current: 0, avg: 0, max: 0, min: 0 }
    }
    const current = throughputSeries[throughputSeries.length - 1] ?? 0
    const sum = throughputSeries.reduce((acc, v) => acc + v, 0)
    const avg = sum / throughputSeries.length
    const max = Math.max(...throughputSeries)
    const min = Math.min(...throughputSeries)
    const firstPoint = throughputChartPoints[0]
    const lastPoint = throughputChartPoints[throughputChartPoints.length - 1]
    const peakPoint =
      throughputChartPoints.find((p) => p.count === max) ?? lastPoint
    return {
      current,
      avg,
      max,
      min,
      startTime: firstPoint?.shortTime ?? "-",
      endTime: lastPoint?.shortTime ?? "-",
      peakTime: peakPoint?.shortTime ?? "-",
      currentTime: lastPoint?.shortTime ?? "-",
    }
  }, [throughputSeries, throughputChartPoints])

  const throughputPlot = useMemo(() => {
    const n = throughputChartPoints.length
    const width = 860
    const height = 240
    const padLeft = 56
    const padRight = 56
    const padTop = 12
    const padBottom = 72
    const innerW = width - padLeft - padRight
    const innerH = height - padTop - padBottom

    if (!n) {
      return {
        width,
        height,
        padLeft,
        padRight,
        padTop,
        padBottom,
        points: "",
        areaPath: "",
        xTicks: [] as Array<{ x: number; label: string }>,
        yTicks: [] as Array<{ y: number; value: number }>,
      }
    }

    const values = throughputChartPoints.map((p) => p.count)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1e-6, max - min)

    const coords = throughputChartPoints.map((p, i) => {
      const x =
        n === 1 ? padLeft + innerW / 2 : padLeft + (i / (n - 1)) * innerW
      const y = padTop + (1 - (p.count - min) / span) * innerH
      return { x, y, label: p.shortTime }
    })

    const points = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ")
    const areaPath = points
      ? `M ${points} L ${(padLeft + innerW).toFixed(2)},${(padTop + innerH).toFixed(2)} L ${padLeft.toFixed(2)},${(padTop + innerH).toFixed(2)} Z`
      : ""

    const yTicks = [max, (max + min) / 2, min].map((v) => ({
      value: v,
      y: padTop + (1 - (v - min) / span) * innerH,
    }))

    const maxTickCount = 6
    const step = Math.max(1, Math.ceil(n / maxTickCount))
    const xTicks = coords
      .filter((_, i) => i % step === 0 || i === n - 1)
      .map((c) => ({ x: c.x, label: c.label }))

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      points,
      areaPath,
      xTicks,
      yTicks,
    }
  }, [throughputChartPoints])

  const utilizationKpiAverage = useMemo(() => {
    if (!utilizationDevices.length) return null
    const sum = utilizationDevices.reduce((acc, d) => acc + d.utilizationPct, 0)
    return sum / utilizationDevices.length
  }, [utilizationDevices])

  const uptimeRows = useMemo(() => {
    return utilizationDevices.map((d) => {
      const pct = d.utilizationPct
      const level: "normal" | "caution" | "warning" =
        pct >= 95 ? "normal" : pct >= 80 ? "caution" : "warning"
      return { id: d.deviceId, pct, level }
    })
  }, [utilizationDevices])

  const uptimeKpiEffectivePct =
    wsTotalUtilization !== null ? wsTotalUtilization : utilizationKpiAverage

  const uptimeKpiValueStr =
    uptimeKpiEffectivePct === null ? "—" : `${uptimeKpiEffectivePct.toFixed(1)}%`

  const uptimeKpiColor =
    uptimeKpiEffectivePct === null
      ? textSecondary
      : uptimeKpiEffectivePct >= 95
        ? statusOnline
        : uptimeKpiEffectivePct >= 80
          ? statusWarning
          : statusError

  const uptimeCounts = useMemo(() => {
    let normal = 0
    let caution = 0
    let warning = 0
    for (const r of uptimeRows) {
      if (r.level === "normal") normal += 1
      else if (r.level === "caution") caution += 1
      else warning += 1
    }
    return { normal, caution, warning, total: uptimeRows.length }
  }, [uptimeRows])

  const uptimeFilteredRows = useMemo(() => {
    const base =
      uptimeFilter === "all"
        ? uptimeRows
        : uptimeRows.filter((r) => r.level === uptimeFilter)
    const levelRank = (l: "normal" | "caution" | "warning") =>
      l === "warning" ? 0 : l === "caution" ? 1 : 2
    return [...base].sort((a, b) => {
      const lr = levelRank(a.level) - levelRank(b.level)
      if (lr !== 0) return lr
      const pr = a.pct - b.pct
      if (pr !== 0) return pr
      return a.id.localeCompare(b.id)
    })
  }, [uptimeRows, uptimeFilter])

  const uptimeLevelColor = useCallback(
    (level: "normal" | "caution" | "warning") => {
      if (level === "normal") return statusOnline
      if (level === "caution") return statusWarning
      return statusError
    },
    [statusOnline, statusWarning, statusError]
  )

  const uptimeLevelLabel = useCallback(
    (level: "normal" | "caution" | "warning") => {
      if (level === "normal") return ui.uptimeNormal
      if (level === "caution") return ui.uptimeCaution
      return ui.uptimeWarning
    },
    [ui]
  )

  const throughputBucketTimeLabel = useMemo(() => {
    const chart = throughputData?.chart ?? []
    if (!chart.length) return "-"
    const firstRaw = chart[0]?.time ?? "-"
    const lastRaw = chart[chart.length - 1]?.time ?? "-"
    const firstParsed = parseKoreanTimestampMs(firstRaw)
    const lastParsed = parseKoreanTimestampMs(lastRaw)
    const start =
      Number.isFinite(firstParsed) && firstRaw !== "-"
        ? formatKoreanDateTime(firstRaw)
        : firstRaw
    const end =
      Number.isFinite(lastParsed) && lastRaw !== "-"
        ? formatKoreanDateTime(lastRaw)
        : lastRaw
    return `${start} ~ ${end}`
  }, [throughputData])

  useEffect(() => {
    if (!uptimeModalOpen) return
    const ac = new AbortController()
    setUtilizationLoading(true)
    setUtilizationError(null)
    fetchDashboardUtilization(ac.signal)
      .then((rows) => {
        if (ac.signal.aborted) return
        setUtilizationDevices(rows)
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setUtilizationError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (ac.signal.aborted) return
        setUtilizationLoading(false)
      })
    return () => ac.abort()
  }, [uptimeModalOpen])

  useEffect(() => {
    if (!outageModalOpen) return
    const ac = new AbortController()
    setOutageModalLoading(true)
    setOutageModalError(null)
    fetchDashboardAllEvents(ac.signal)
      .then((rows) => {
        if (ac.signal.aborted) return
        setOutageModalEventRows([...rows].sort(compareOutageModalRows))
        const buckets = new Map<string, number>()
        for (const key of OUTAGE_SEVERITY_SECTION_ORDER) buckets.set(key, 0)
        for (const row of rows) {
          const section = outageSeveritySection(row.severity)
          buckets.set(section, (buckets.get(section) ?? 0) + 1)
        }
        const firstWithData = OUTAGE_SEVERITY_SECTION_ORDER.find(
          (s) => (buckets.get(s) ?? 0) > 0
        )
        if (firstWithData) setOutageSeverityTab(firstWithData)
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setOutageModalError(e instanceof Error ? e.message : String(e))
        setOutageModalEventRows([])
      })
      .finally(() => {
        if (ac.signal.aborted) return
        setOutageModalLoading(false)
      })
    return () => ac.abort()
  }, [outageModalOpen])

  useEffect(() => {
    const ac = new AbortController()
    setDashboardDeviceListLoading(true)
    setDashboardDeviceListError(null)
    setDashboardOfflineBootstrapped(false)
    setDashboardAllEventsBootstrapped(false)

    Promise.all([
      fetchDashboardDeviceList(ac.signal),
      fetchDashboardOffline(ac.signal).catch(() => []),
      fetchDashboardCriticalOutageEvents(ac.signal).catch(() => []),
    ])
      .then(([ids, offlineEvents, criticalOutageRows]) => {
        if (ac.signal.aborted) return
        const offlineIds = offlineEvents
          .map((e) => e.deviceId)
          .filter((id): id is string => Boolean(id))
        startTransition(() => {
          setDashboardDeviceIds(ids)
          setDashboardDeviceListReady(true)
          setDashboardDeviceListLoading(false)
          setDashboardDeviceListError(null)
          const offlineSet = new Set(offlineIds)
          setWsOfflineDeviceIds(
            Array.from(offlineSet).sort((a, b) => a.localeCompare(b))
          )
          setDashboardOfflineBootstrapped(true)
          setDashboardCriticalOutageRows(criticalOutageRows)
          setDashboardAllEventsBootstrapped(true)
          setLiveDevices((prev) => {
            const base = prev ?? []
            if (!base.length) return base
            const byId = new Map(base.map((d) => [d.id, d]))
            const now = new Date().toISOString()
            for (const id of offlineSet) {
              const old = byId.get(id)
              if (!old) continue
              byId.set(id, {
                ...old,
                status: "Offline",
                lastSeenMinutes: Math.max(old.lastSeenMinutes ?? 0, 1),
                lastSeenAt: now,
                updatedAt: now,
              })
            }
            return Array.from(byId.values())
          })
        })
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setDashboardDeviceListError(
          e instanceof Error ? e.message : String(e)
        )
        setDashboardDeviceIds([])
        setDashboardDeviceListReady(false)
        setDashboardDeviceListLoading(false)
        setDashboardOfflineBootstrapped(true)
        setDashboardCriticalOutageRows([])
        setDashboardAllEventsBootstrapped(true)
      })

    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (
      !modalOpen &&
      !fleetModalOpen &&
      !onlineOfflineModalOpen &&
      !outageModalOpen &&
      !eventDetailOpen &&
      !throughputModalOpen &&
      !uptimeModalOpen
    )
      return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (eventDetailOpen) {
          closeEventDetail()
          return
        }
        closeModal()
        closeFleetModal()
        closeOnlineOfflineModal()
        closeOutageModal()
        closeThroughputModal()
        closeUptimeModal()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    modalOpen,
    fleetModalOpen,
    onlineOfflineModalOpen,
    outageModalOpen,
    eventDetailOpen,
    throughputModalOpen,
    uptimeModalOpen,
    closeModal,
    closeFleetModal,
    closeOnlineOfflineModal,
    closeOutageModal,
    closeEventDetail,
    closeThroughputModal,
    closeUptimeModal,
  ])

  const isFixedWidth = style && style.width === "100%"
  const isFixedHeight = style && style.height === "100%"

  return (
    <div
      ref={containerRef}
      className="rm-dashboard-root"
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        background,
        color: textPrimary,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        boxSizing: "border-box",
        overflow: "hidden",
        ...(isFixedWidth ? null : { minWidth: 960 }),
        ...(isFixedHeight ? null : { minHeight: 640 }),
      }}
    >
      <style>{`
        .rm-dashboard-root * {
          scrollbar-color: ${withAlpha(borderColor, 0.9)} ${cardBackground};
        }
        .rm-dashboard-root *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .rm-dashboard-root *::-webkit-scrollbar-track {
          background: ${cardBackground};
        }
        .rm-dashboard-root *::-webkit-scrollbar-thumb {
          background: ${withAlpha(borderColor, 0.95)};
          border-radius: 999px;
          border: 2px solid ${cardBackground};
        }
        .rm-dashboard-root *::-webkit-scrollbar-corner {
          background: ${cardBackground};
        }
      `}</style>

      <header
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: 14,
          borderRadius: 14,
          background: panelBackground,
          border: `1px solid ${borderColor}`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              ...headingFont,
              fontSize: coerceFontSize(headingFont?.fontSize, 22),
              lineHeight: headingFont?.lineHeight ?? "1.1em",
              letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 6,
              ...bodyFont,
              fontSize: coerceFontSize(bodyFont?.fontSize, 14),
              lineHeight: bodyFont?.lineHeight ?? "1.3em",
              letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
              color: textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Badge
            label={`In view: ${inView ? "Yes" : "No"}`}
            color={inView ? statusOnline : textSecondary}
            font={monoFont}
          />
          <Badge
            label={
              enableRealtimeSimulation
                ? `Realtime: ${isStatic ? "Static" : "On"}`
                : "Realtime: Off"
            }
            color={
              enableRealtimeSimulation
                ? isStatic
                  ? textSecondary
                  : accent
                : textSecondary
            }
            font={monoFont}
          />
          <Badge
            label={`Active: ${activeSummary}`}
            color={textSecondary}
            font={monoFont}
            subtle
          />
          <Badge
            label={wsConnected ? "WS: 연결됨" : "WS: 미연결"}
            color={wsConnected ? statusOnline : statusOffline}
            font={monoFont}
          />
          <Badge
            label={`WS Last: ${lastWsMessageAt ? formatKoreanTime(lastWsMessageAt) : "-"}`}
            color={lastWsMessageAt ? accent : textSecondary}
            font={monoFont}
            subtle
          />
        </div>
      </header>

      {showKPIs && (
        <section
          aria-label="KPI summary"
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <KPI
            title={ui.kpiTotal}
            value={kpiTotalDevicesDisplay}
            hint=""
            color={accent}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
            onClick={openFleetModal}
          />
          <KPI
            title={ui.kpiOnlineOffline}
            value={kpiOnlineOfflineValue}
            hint=""
            color={
              kpis.error > 0
                ? statusError
                : kpis.warning > 0
                  ? statusWarning
                  : statusOnline
            }
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
            onClick={openOnlineOfflineModal}
          />
          <KPI
            title={ui.kpiAvgBattery}
            value={`${kpis.hotDevices} / ${kpis.total}`}
            hint="Hot > 90°C"
            color={kpis.hotDevices > 0 ? statusError : accent}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
          />
          <KPI
            title={ui.kpiAvgTemp}
            value={`${throughputData?.todayCount ?? 0}`}
            hint=""
            color={kpis.production > 0 ? accent : textSecondary}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
            onClick={openThroughputModal}
          />
          <KPI
            title={ui.kpiErrorRate}
            value={kpiOutageValue}
            hint=""
            color={
              dashboardCriticalOutageRows.length > 0 ? statusError : accent
            }
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
            onClick={openOutageModal}
          />
          <KPI
            title={ui.kpiEmergency}
            value={uptimeKpiValueStr}
            hint=""
            color={uptimeKpiColor}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
            onClick={openUptimeModal}
          />
        </section>
      )}

      <main
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: showDetailPanel
            ? "minmax(540px, 1.55fr) minmax(360px, 1fr)"
            : "1fr",
          gap: 12,
        }}
      >
        <section
          aria-label="Devices"
          style={{
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              padding: "0 2px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  ...bodyFont,
                  fontSize: coerceFontSize(bodyFont?.fontSize, 16),
                  lineHeight: bodyFont?.lineHeight ?? "1.2em",
                  letterSpacing: bodyFont?.letterSpacing ?? "-0.015em",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {ui.fleetOverview}
              </div>
              <div
                style={{
                  ...monoFont,
                  fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  color: textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                총 장비 {derivedDevices.length}대
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                background: cardBackground,
                border: `1px solid ${borderColor}`,
                padding: 12,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {!groupBySite ? (
                renderTable(filteredDevices)
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 0,
                  }}
                >
                  {(groups ?? []).map((g) => (
                    <div
                      key={g.site}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "0 2px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              ...bodyFont,
                              fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                              color: textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {g.site}
                          </span>
                          <span
                            style={{
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              color: textSecondary,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {g.devices.length} devices
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Badge
                            label={`${g.devices.filter((d) => d.status === "Online").length} online`}
                            color={statusOnline}
                            font={monoFont}
                            subtle
                          />
                          <Badge
                            label={`${g.devices.filter((d) => d.status === "Offline").length} offline`}
                            color={statusOffline}
                            font={monoFont}
                            subtle
                          />
                          <Badge
                            label={`${g.devices.filter((d) => d.emergency).length} emergency`}
                            color={statusError}
                            font={monoFont}
                            subtle
                          />
                        </div>
                      </div>
                      {renderTable(g.devices)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {showDetailPanel && (
          <aside
            aria-label="Copilot panel"
            style={{
              minHeight: 0,
              borderRadius: 14,
              background: panelBackground,
              border: `1px solid ${borderColor}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: `1px solid ${borderColor}`,
                background: panelBackground,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      ...headingFont,
                      fontSize: coerceFontSize(headingFont?.fontSize, 17),
                      lineHeight: headingFont?.lineHeight ?? "1.1em",
                      letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ui.copilotTitle}
                  </div>
                  <div
                    style={{
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 12),
                      lineHeight: bodyFont?.lineHeight ?? "1.3em",
                      letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                      color: textSecondary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ui.copilotSubtitle}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => startTransition(() => setRightTab("fleetMap"))}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: rightTab === "fleetMap" ? cardBackground : "transparent",
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    height: 32,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.tabFleetMap}
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setRightTab("insights"))}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: rightTab === "insights" ? cardBackground : "transparent",
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    height: 32,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.tabInsights}
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setRightTab("chat"))}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: rightTab === "chat" ? cardBackground : "transparent",
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    height: 32,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          border: `1px solid ${withAlpha(textSecondary, 0.35)}`,
                          boxShadow: `0 1px 2px ${withAlpha("#000000", 0.2)}`,
                          background: "#FFFFFF",
                        }}
                      >
                        <img
                          src={DAISY_LOGO_SRC}
                          alt=""
                          style={{
                            width: "170%",
                            height: "170%",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </span>
                  {ui.tabChat}
                </button>
                <span
                  style={{
                    marginLeft: "auto",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                    color: textSecondary,
                    whiteSpace: "nowrap",
                  }}
                >
                  {enableRealtimeSimulation && !isStatic ? ui.live : ui.snapshot}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {rightTab === "fleetMap" ? (
                <div
                  style={{
                    borderRadius: 14,
                    background: cardBackground,
                    border: `1px solid ${borderColor}`,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge label={`${fleetPose.points.length} tracked`} color={accent} font={monoFont} subtle />
                    {fleetPose.hiddenCount > 0 ? (
                      <Badge
                        label={`${ui.hiddenNoPose} ${fleetPose.hiddenCount}`}
                        color={textSecondary}
                        font={monoFont}
                        subtle
                      />
                    ) : null}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      height: "clamp(220px, 46vh, 360px)",
                      borderRadius: 10,
                      border: `1px solid ${borderColor}`,
                      background: panelBackground,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {fleetPose.points.length === 0 || !fleetPose.bounds ? (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          ...bodyFont,
                          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                          color: textSecondary,
                        }}
                      >
                        {ui.noPoseData}
                      </div>
                    ) : (
                      <svg width="100%" height="100%" viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="fleet-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={withAlpha(accent, 0.05)} />
                            <stop offset="48%" stopColor={withAlpha("#0B2330", 0.42)} />
                            <stop offset="100%" stopColor={withAlpha("#081A27", 0.48)} />
                          </linearGradient>
                          <linearGradient id="fleet-glass-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={withAlpha("#D9F7FF", 0.12)} />
                            <stop offset="42%" stopColor={withAlpha("#D9F7FF", 0.03)} />
                            <stop offset="100%" stopColor={withAlpha("#D9F7FF", 0)} />
                          </linearGradient>
                          <pattern id="fleet-grid-major" width="105" height="68" patternUnits="userSpaceOnUse">
                            <path d="M 105 0 L 0 0 0 68" fill="none" stroke={withAlpha("#2A5164", 0.34)} strokeWidth="1" />
                          </pattern>
                          <pattern id="fleet-grid-minor" width="35" height="22.6" patternUnits="userSpaceOnUse">
                            <path d="M 35 0 L 0 0 0 22.6" fill="none" stroke={withAlpha("#1F3F52", 0.2)} strokeWidth="0.7" />
                          </pattern>
                          <filter id="fleet-glow">
                            <feGaussianBlur stdDeviation="2.4" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <rect x="0" y="0" width="1000" height="460" fill="url(#fleet-bg)" />
                        <rect x="0" y="0" width="1000" height="460" fill="url(#fleet-glass-sheen)" />
                        <rect x="0" y="0" width="1000" height="460" fill="url(#fleet-grid-minor)" />
                        <rect x="0" y="0" width="1000" height="460" fill="url(#fleet-grid-major)" />
                        {fleetPose.points.map((p) => {
                          const device = derivedDeviceById.get(p.id)
                          const missionText = device?.mission?.trim() || "-"
                          const eventText = device?.lastEventType?.trim() || "-"
                          const missionMatched =
                            selectedMissionFilter === "ALL" ||
                            missionText === selectedMissionFilter
                          const eventMatched =
                            selectedEventTypeFilter === "ALL" ||
                            eventText === selectedEventTypeFilter
                          const matchedByDetail =
                            mapIndicatorMode === "mission"
                              ? missionMatched
                              : mapIndicatorMode === "eventType"
                                ? eventMatched
                                : true
                          const nx =
                            (p.x - fleetPose.bounds!.minX) /
                            Math.max(1e-6, fleetPose.bounds!.maxX - fleetPose.bounds!.minX)
                          const ny =
                            (p.y - fleetPose.bounds!.minY) /
                            Math.max(1e-6, fleetPose.bounds!.maxY - fleetPose.bounds!.minY)
                          const px = 24 + nx * 952
                          const py = 24 + (1 - ny) * 412
                          const baseColor =
                            mapIndicatorMode === "mission"
                              ? getMissionColor(missionText, accent)
                              : mapIndicatorMode === "eventType"
                                ? getEventSeverityColor(device?.lastEventSeverity)
                                : "#35F2C7"
                          const c = matchedByDetail
                            ? baseColor
                            : withAlpha(textSecondary, 0.35)
                          const r = 5.3
                          const labelX = Math.min(Math.max(px + 11, 12), 860)
                          const labelY = Math.min(Math.max(py - 9, 14), 442)
                          const labelW = Math.min(124, Math.max(66, p.id.length * 7.2 + 20))
                          return (
                            <g key={`pose-${p.id}`} opacity={matchedByDetail ? 1 : 0.4}>
                              <circle cx={px} cy={py} r={r + 4.5} fill={withAlpha(c, 0.2)} filter="url(#fleet-glow)" />
                              <circle cx={px} cy={py} r={r} fill={c} />
                              <rect
                                x={labelX}
                                y={labelY - 10}
                                rx={8}
                                ry={8}
                                width={labelW}
                                height={19}
                                fill={withAlpha("#08202B", 0.92)}
                                stroke={withAlpha(c, 0.35)}
                                strokeWidth="1"
                              />
                              <text
                                x={labelX + 8}
                                y={labelY + 3.5}
                                fill={withAlpha("#D8F5FF", 0.92)}
                                style={{
                                  fontSize: `${coerceFontSize(monoFont?.fontSize, 11)}px`,
                                  fontFamily: String(monoFont?.fontFamily ?? "monospace"),
                                }}
                              >
                                {p.id}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    )}
                  </div>

                  <div
                    onMouseEnter={() => {
                      if (fleetHoverCloseTimerRef.current !== null) {
                        window.clearTimeout(fleetHoverCloseTimerRef.current)
                        fleetHoverCloseTimerRef.current = null
                      }
                    }}
                    onMouseLeave={() => {
                      if (fleetHoverCloseTimerRef.current !== null) {
                        window.clearTimeout(fleetHoverCloseTimerRef.current)
                      }
                      fleetHoverCloseTimerRef.current = window.setTimeout(() => {
                        startTransition(() => setFleetHoverMenu(null))
                        fleetHoverCloseTimerRef.current = null
                      }, 160)
                    }}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "nowrap",
                      overflow: "visible",
                    }}
                  >
                    <button
                      type="button"
                      onMouseEnter={() =>
                        startTransition(() => {
                          setFleetHoverMenu(null)
                          setMapIndicatorMode("default")
                          setSelectedMissionFilter("ALL")
                          setSelectedEventTypeFilter("ALL")
                        })
                      }
                      style={{
                        border: `1px solid ${withAlpha(
                          mapIndicatorMode === "default" ? accent : textSecondary,
                          mapIndicatorMode === "default" ? 0.5 : 0.2
                        )}`,
                        background:
                          mapIndicatorMode === "default"
                            ? `linear-gradient(180deg, ${withAlpha(accent, 0.2)}, ${withAlpha(accent, 0.12)})`
                            : withAlpha(textSecondary, 0.08),
                        color:
                          mapIndicatorMode === "default"
                            ? accent
                            : withAlpha(textSecondary, 0.95),
                        borderRadius: 999,
                        padding: "7px 12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        lineHeight: monoFont?.lineHeight ?? "1em",
                        letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background:
                            mapIndicatorMode === "default" ? accent : withAlpha(textSecondary, 0.95),
                          boxShadow:
                            mapIndicatorMode === "default"
                              ? `0 0 0 3px ${withAlpha(accent, 0.14)}`
                              : "none",
                        }}
                      />
                      {ui.mapTagDefault}
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() =>
                        startTransition(() => {
                          setFleetHoverMenu("mission")
                          setMapIndicatorMode("mission")
                        })
                      }
                      style={{
                        border: `1px solid ${withAlpha(
                          mapIndicatorMode === "mission" ? accent : textSecondary,
                          mapIndicatorMode === "mission" ? 0.5 : 0.2
                        )}`,
                        background:
                          mapIndicatorMode === "mission"
                            ? `linear-gradient(180deg, ${withAlpha(accent, 0.2)}, ${withAlpha(accent, 0.12)})`
                            : withAlpha(textSecondary, 0.08),
                        color:
                          mapIndicatorMode === "mission"
                            ? accent
                            : withAlpha(textSecondary, 0.95),
                        borderRadius: 999,
                        padding: "7px 12px",
                        cursor: "default",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        lineHeight: monoFont?.lineHeight ?? "1em",
                        letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background:
                            mapIndicatorMode === "mission" ? accent : withAlpha(textSecondary, 0.95),
                          boxShadow:
                            mapIndicatorMode === "mission"
                              ? `0 0 0 3px ${withAlpha(accent, 0.14)}`
                              : "none",
                        }}
                      />
                      {ui.mapTagMission}
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() =>
                        startTransition(() => {
                          setFleetHoverMenu("event")
                          setMapIndicatorMode("eventType")
                        })
                      }
                      style={{
                        border: `1px solid ${withAlpha(
                          mapIndicatorMode === "eventType" ? accent : textSecondary,
                          mapIndicatorMode === "eventType" ? 0.5 : 0.2
                        )}`,
                        background:
                          mapIndicatorMode === "eventType"
                            ? `linear-gradient(180deg, ${withAlpha(accent, 0.2)}, ${withAlpha(accent, 0.12)})`
                            : withAlpha(textSecondary, 0.08),
                        color:
                          mapIndicatorMode === "eventType"
                            ? accent
                            : withAlpha(textSecondary, 0.95),
                        borderRadius: 999,
                        padding: "7px 12px",
                        cursor: "default",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        lineHeight: monoFont?.lineHeight ?? "1em",
                        letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background:
                            mapIndicatorMode === "eventType" ? accent : withAlpha(textSecondary, 0.95),
                          boxShadow:
                            mapIndicatorMode === "eventType"
                              ? `0 0 0 3px ${withAlpha(accent, 0.14)}`
                              : "none",
                        }}
                      />
                      {ui.mapTagEvent}
                    </button>

                    {fleetHoverMenu ? (
                      <div
                        role="menu"
                        onMouseEnter={() => {
                          if (fleetHoverCloseTimerRef.current !== null) {
                            window.clearTimeout(fleetHoverCloseTimerRef.current)
                            fleetHoverCloseTimerRef.current = null
                          }
                        }}
                        onMouseLeave={() => {
                          if (fleetHoverCloseTimerRef.current !== null) {
                            window.clearTimeout(fleetHoverCloseTimerRef.current)
                          }
                          fleetHoverCloseTimerRef.current = window.setTimeout(() => {
                            startTransition(() => setFleetHoverMenu(null))
                            fleetHoverCloseTimerRef.current = null
                          }, 160)
                        }}
                        style={{
                          position: "absolute",
                          left: 0,
                          bottom: "calc(100% + 10px)",
                          width: "fit-content",
                          maxWidth: 280,
                          minWidth: 0,
                          borderRadius: 14,
                          background: panelBackground,
                          border: `1px solid ${borderColor}`,
                          boxShadow: `0 18px 50px ${withAlpha("#000", 0.45)}`,
                          overflow: "hidden",
                          zIndex: 10,
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 12px",
                            borderBottom: `1px solid ${borderColor}`,
                            background: cardBackground,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              color: textSecondary,
                              whiteSpace: "nowrap",
                              userSelect: "none",
                            }}
                          >
                            {fleetHoverMenu === "mission"
                              ? language === "ko"
                                ? "상태 필터"
                                : "Status filters"
                              : language === "ko"
                                ? "이벤트 필터"
                                : "Event filters"}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            background: panelBackground,
                            maxHeight: 260,
                            overflow: "auto",
                            width: "fit-content",
                          }}
                        >
                          {(fleetHoverMenu === "mission" ? missionFilterOptions : eventTypeFilterOptions).map(
                            (value) => {
                              const active =
                                fleetHoverMenu === "mission"
                                  ? selectedMissionFilter === value
                                  : selectedEventTypeFilter === value
                              const color =
                                fleetHoverMenu === "mission"
                                  ? getMissionColor(value, accent)
                                  : getEventSeverityColor(
                                      derivedDevices.find(
                                        (d) => d.lastEventType?.trim() === value
                                      )?.lastEventSeverity
                                    )
                              return (
                                <button
                                  key={`${fleetHoverMenu}-${value}`}
                                  type="button"
                                  role="menuitem"
                                  onMouseEnter={() =>
                                    startTransition(() => {
                                      if (fleetHoverMenu === "mission") {
                                        setSelectedMissionFilter(value)
                                      } else {
                                        setSelectedEventTypeFilter(value)
                                      }
                                    })
                                  }
                                  style={{
                                    borderRadius: 12,
                                    border: `1px solid ${withAlpha(color, active ? 0.38 : 0.2)}`,
                                    background: active
                                      ? `linear-gradient(180deg, ${withAlpha(color, 0.2)}, ${withAlpha(color, 0.1)})`
                                      : cardBackground,
                                    padding: "8px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    gap: 6,
                                    cursor: "default",
                                    color: textPrimary,
                                    textAlign: "left",
                                    width: "fit-content",
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 999,
                                      background: withAlpha(color, 0.9),
                                      boxShadow: `0 0 0 3px ${withAlpha(color, 0.14)}`,
                                      flex: "0 0 auto",
                                    }}
                                  />
                                  <span
                                    style={{
                                      ...monoFont,
                                      fontSize: coerceFontSize(monoFont?.fontSize, 12),
                                      color: textPrimary,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      userSelect: "none",
                                    }}
                                  >
                                    {value}
                                  </span>
                                </button>
                              )
                            }
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : rightTab === "insights" ? (
                <>
                  <div
                    style={{
                      borderRadius: 14,
                      background: cardBackground,
                      border: `1px solid ${borderColor}`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        ...bodyFont,
                        fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                        lineHeight: bodyFont?.lineHeight ?? "1.35em",
                        letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                        fontWeight: 500,
                        color: textPrimary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ui.insightsOverview}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <MetricCard
                        label={ui.kpiTotal}
                        value={`${copilotInsights.total}`}
                        hint={ui.hintAllUnits}
                        color={accent}
                        bg={panelBackground}
                        border={borderColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        labelFont={monoFont}
                        valueFont={headingFont}
                      />
                      <MetricCard
                        label={ui.filterOffline}
                        value={`${copilotInsights.offline}`}
                        hint=""
                        color={statusOffline}
                        bg={panelBackground}
                        border={borderColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        labelFont={monoFont}
                        valueFont={headingFont}
                      />
                      <MetricCard
                        label={ui.filterLowBattery}
                        value={`${copilotInsights.low}`}
                        hint={`≤ ${Math.round(lowBatteryThreshold)}%`}
                        color={statusWarning}
                        bg={panelBackground}
                        border={borderColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        labelFont={monoFont}
                        valueFont={headingFont}
                      />
                      <MetricCard
                        label={ui.hotDeviceCount}
                        value={`${copilotInsights.hot} / ${copilotInsights.total}`}
                        hint={`Hot > 90°C`}
                        color={statusError}
                        bg={panelBackground}
                        border={borderColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        labelFont={monoFont}
                        valueFont={headingFont}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 14,
                      background: cardBackground,
                      border: `1px solid ${borderColor}`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          ...bodyFont,
                          fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                          lineHeight: bodyFont?.lineHeight ?? "1.35em",
                          letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                          fontWeight: 500,
                          color: textPrimary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ui.insightsAnomalies}
                      </div>
                      <Badge
                        label={`${copilotInsights.anomalies.length}`}
                        color={copilotInsights.anomalies.length ? statusWarning : textSecondary}
                        font={monoFont}
                        subtle
                      />
                    </div>

                    {copilotInsights.anomalies.length === 0 ? (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background: panelBackground,
                          border: `1px solid ${borderColor}`,
                          color: textSecondary,
                          ...bodyFont,
                          fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                        }}
                      >
                        {ui.insightsNoAnomaly}
                      </div>
                    ) : (
                      <div
                        role="table"
                        aria-label="Anomaly list"
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: `1px solid ${borderColor}`,
                          background: panelBackground,
                        }}
                      >
                        <div
                          role="row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.1fr 0.8fr 1.2fr",
                            gap: 10,
                            padding: "10px 12px",
                            borderBottom: `1px solid ${borderColor}`,
                            color: textSecondary,
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          }}
                        >
                          <span role="columnheader">Robot</span>
                          <span role="columnheader">Site</span>
                          <span role="columnheader">Reason</span>
                        </div>
                        <div role="rowgroup" style={{ maxHeight: 220, overflow: "auto" }}>
                          {copilotInsights.anomalies.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => onSelect(a.id)}
                              style={{
                                width: "100%",
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <div
                                role="row"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1.1fr 0.8fr 1.2fr",
                                  gap: 10,
                                  padding: "10px 12px",
                                  borderBottom: `1px solid ${borderColor}`,
                                  background: cardBackground,
                                }}
                              >
                                <span
                                  role="cell"
                                  style={{
                                    ...monoFont,
                                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                                    color: textPrimary,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {a.id}
                                </span>
                                <span
                                  role="cell"
                                  style={{
                                    ...monoFont,
                                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                                    color: textSecondary,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {a.site}
                                </span>
                                <span
                                  role="cell"
                                  style={{
                                    ...monoFont,
                                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                                    color: statusWarning,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {a.reasons.join(" • ")}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflow: "auto",
                      paddingRight: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {chatMessages.map((m, idx) => {
                      const isUser = m.role === "user"
                      const bubbleBg = isUser ? withAlpha(accent, 0.18) : cardBackground
                      const bubbleBorder = isUser ? withAlpha(accent, 0.25) : borderColor
                      return (
                        <div
                          key={`${m.role}-${idx}-${m.ts}-side`}
                          style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
                        >
                          <div
                            style={{
                              maxWidth: "92%",
                              borderRadius: 14,
                              padding: "10px 12px",
                              background: bubbleBg,
                              border: `1px solid ${bubbleBorder}`,
                              color: textPrimary,
                            }}
                          >
                            <div
                              style={{
                                ...bodyFont,
                                fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                                lineHeight: bodyFont?.lineHeight ?? "1.35em",
                                letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                              }}
                            >
                              {m.text}
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                ...monoFont,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                color: textSecondary,
                                textAlign: isUser ? "right" : "left",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.ts}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      value={chatInput}
                      onChange={(e) => startTransition(() => setChatInput(e.target.value))}
                      placeholder={chatPlaceholder}
                      aria-label={ui.chat}
                      style={{
                        flex: 1,
                        border: `1px solid ${borderColor}`,
                        background: cardBackground,
                        color: textPrimary,
                        borderRadius: 12,
                        padding: "10px 12px",
                        outline: "none",
                        ...bodyFont,
                        fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          sendChat()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendChat}
                      aria-label={ui.send}
                      style={{
                        border: `1px solid ${withAlpha(accent, 0.35)}`,
                        background: withAlpha(accent, 0.18),
                        color: textPrimary,
                        borderRadius: 12,
                        padding: "10px 12px",
                        cursor: "pointer",
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ui.send}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {modalOpen && selected ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={ui.detailPanel}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal()
            }}
          >
            <div
              style={{
                width: "min(980px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        ...headingFont,
                        fontSize: coerceFontSize(headingFont?.fontSize, 18),
                        lineHeight: headingFont?.lineHeight ?? "1.1em",
                        letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selected.name}
                    </div>
                    <span>{statusPill(selected.status)}</span>
                    <Badge
                      label={selected.emergency ? "Emergency" : "Normal"}
                      color={
                        selected.emergency ? statusError : textSecondary
                      }
                      font={monoFont}
                      subtle={!selected.emergency}
                    />
                  </div>
                  <div
                    style={{
                      ...monoFont,
                      fontSize: coerceFontSize(monoFont?.fontSize, 12),
                      lineHeight: monoFont?.lineHeight ?? "1.2em",
                      letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                      color: textSecondary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ui.robotId}: {selected.id}
                  </div>
                  <div
                    style={{
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                      lineHeight: bodyFont?.lineHeight ?? "1.3em",
                      letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                      color: textSecondary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ui.currentLocation}: {currentLocation}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label={ui.close}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "10px 12px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                    lineHeight: monoFont?.lineHeight ?? "1em",
                  }}
                >
                  {ui.close}
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 0,
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(320px, 0.9fr) minmax(420px, 1.1fr)",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      borderRadius: 14,
                      background: cardBackground,
                      border: `1px solid ${borderColor}`,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          ...headingFont,
                          fontSize: coerceFontSize(headingFont?.fontSize, 16),
                          lineHeight: headingFont?.lineHeight ?? "1.1em",
                          letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                          color: textPrimary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ui.batteryGauge}
                      </div>
                      <div
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatBattery(selected.battery)}%
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 0",
                      }}
                    >
                      <BatteryGauge
                        value={selected.battery}
                        size={168}
                        stroke={14}
                        trackColor={withAlpha(borderColor, 0.65)}
                        valueColor={
                          selected.battery <= lowBatteryThreshold
                            ? statusWarning
                            : accent
                        }
                        textColor={textPrimary}
                        font={headingFont}
                        bg={cardBackground}
                        border={borderColor}
                        tickColor={withAlpha(textSecondary, 0.5)}
                      />
                    </div>

                    <div
                      style={{
                        ...headingFont,
                        fontSize: coerceFontSize(headingFont?.fontSize, 15),
                        lineHeight: headingFont?.lineHeight ?? "1.1em",
                        letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                        color: textPrimary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ui.sensorStatus}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      {sensorIndicators.map((s) => {
                        const c =
                          s.state === "error"
                            ? statusError
                            : s.state === "warn"
                              ? statusWarning
                              : statusOnline
                        return (
                          <div
                            key={s.label}
                            style={{
                              borderRadius: 12,
                              border: `1px solid ${withAlpha(c, 0.22)}`,
                              background: withAlpha(c, 0.08),
                              padding: 10,
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  ...monoFont,
                                  fontSize: coerceFontSize(
                                    monoFont?.fontSize,
                                    12
                                  ),
                                  color: textPrimary,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.label}
                              </span>
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 999,
                                  background: c,
                                  boxShadow: `0 0 0 3px ${withAlpha(c, 0.14)}`,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                ...bodyFont,
                                fontSize: coerceFontSize(
                                  bodyFont?.fontSize,
                                  13
                                ),
                                color: textSecondary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {s.detail}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        background: cardBackground,
                        border: `1px solid ${borderColor}`,
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        minHeight: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            ...headingFont,
                            fontSize: coerceFontSize(headingFont?.fontSize, 16),
                            lineHeight: headingFont?.lineHeight ?? "1.1em",
                            letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                            color: textPrimary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ui.recentLogs}
                        </div>
                        <div
                          style={{
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 12),
                            color: textSecondary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {enableRealtimeSimulation && !isStatic
                            ? ui.live
                            : ui.snapshot}
                        </div>
                      </div>

                      <div
                        role="table"
                        aria-label="Recent logs"
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          border: `1px solid ${borderColor}`,
                          background: panelBackground,
                        }}
                      >
                        <div
                          role="row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "0.7fr 1fr 2.4fr",
                            gap: 10,
                            padding: "10px 12px",
                            background: panelBackground,
                            borderBottom: `1px solid ${borderColor}`,
                            color: textSecondary,
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 12),
                            lineHeight: monoFont?.lineHeight ?? "1.2em",
                            letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                            userSelect: "none",
                          }}
                        >
                          <span role="columnheader">Type</span>
                          <span role="columnheader">Time</span>
                          <span role="columnheader">Message</span>
                        </div>
                        <div
                          role="rowgroup"
                          style={{
                            maxHeight: 210,
                            overflow: "auto",
                            background: cardBackground,
                          }}
                        >
                          {logs.slice(0, 8).map((l, idx) => {
                            const sevColor =
                              l.sev === "error"
                                ? "#EF4444"
                                : l.sev === "warn"
                                  ? "#F59E0B"
                                  : "#3B82F6"
                            return (
                              <div
                                key={`${l.t}-${idx}-modal`}
                                role="row"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "0.7fr 1fr 2.4fr",
                                  gap: 10,
                                  padding: "10px 12px",
                                  borderBottom: `1px solid ${borderColor}`,
                                  background: cardBackground,
                                }}
                              >
                                <span
                                  role="cell"
                                  style={{
                                    ...monoFont,
                                    fontSize: coerceFontSize(
                                      monoFont?.fontSize,
                                      12
                                    ),
                                    color: sevColor,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {l.t}
                                </span>
                                <span
                                  role="cell"
                                  style={{
                                    ...monoFont,
                                    fontSize: coerceFontSize(
                                      monoFont?.fontSize,
                                      12
                                    ),
                                    color: textSecondary,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {l.stamp}
                                </span>
                                <span
                                  role="cell"
                                  style={{
                                    ...bodyFont,
                                    fontSize: coerceFontSize(
                                      bodyFont?.fontSize,
                                      13
                                    ),
                                    color: textPrimary,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {l.msg}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        background: cardBackground,
                        border: `1px solid ${borderColor}`,
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            ...headingFont,
                            fontSize: coerceFontSize(headingFont?.fontSize, 16),
                            lineHeight: headingFont?.lineHeight ?? "1.1em",
                            letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                            color: textPrimary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ui.batteryHistory}
                        </div>
                        <div
                          style={{
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 12),
                            color: textSecondary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ui.lastApprox}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                ...monoFont,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                color: textSecondary,
                              }}
                            >
                              Battery
                            </span>
                            <span
                              style={{
                                ...monoFont,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                color: textSecondary,
                              }}
                            >
                              {formatBattery(selected.battery)}% / Ref {Math.round(lowBatteryThreshold)}%
                            </span>
                          </div>
                          <div style={{ height: 72, width: "100%" }}>
                            <Sparkline
                              values={batterySeries}
                              stroke={
                                selected.battery <= lowBatteryThreshold
                                  ? statusWarning
                                  : accent
                              }
                              fill={withAlpha(
                                selected.battery <= lowBatteryThreshold
                                  ? statusWarning
                                  : accent,
                                0.12
                              )}
                              grid={withAlpha(borderColor, 0.55)}
                              referenceValue={lowBatteryThreshold}
                              referenceColor={statusWarning}
                            />
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                ...monoFont,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                color: textSecondary,
                              }}
                            >
                              Temperature
                            </span>
                            <span
                              style={{
                                ...monoFont,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                color: textSecondary,
                              }}
                            >
                              {formatTemp(selected.temperature)} / Ref {Math.round(abnormalTempThreshold)}°C
                            </span>
                          </div>
                          <div style={{ height: 72, width: "100%" }}>
                            <Sparkline
                              values={tempSeries}
                              stroke={
                                selected.temperature >= abnormalTempThreshold
                                  ? statusError
                                  : "#60A5FA"
                              }
                              fill={withAlpha(
                                selected.temperature >= abnormalTempThreshold
                                  ? statusError
                                  : "#60A5FA",
                                0.12
                              )}
                              grid={withAlpha(borderColor, 0.55)}
                              referenceValue={abnormalTempThreshold}
                              referenceColor={statusError}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {fleetModalOpen ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 55,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="전체 장비 목록"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeFleetModal()
            }}
          >
            <div
              style={{
                width: "min(760px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...headingFont,
                    fontSize: coerceFontSize(headingFont?.fontSize, 18),
                    color: textPrimary,
                  }}
                >
                  등록된 전체 장비 (
                  {dashboardDeviceListReady
                    ? dashboardDeviceIds.length
                    : sortedFleetDevices.length}
                  )
                </div>
                <button
                  type="button"
                  onClick={closeFleetModal}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  닫기
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {dashboardDeviceListLoading ? (
                  <div
                    style={{
                      padding: 12,
                      color: textSecondary,
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    }}
                  >
                    {ui.fleetDeviceListLoading}
                  </div>
                ) : dashboardDeviceListReady ? (
                  dashboardDeviceIds.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        color: textSecondary,
                        ...bodyFont,
                        fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                      }}
                    >
                      {ui.fleetDeviceListEmpty}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {dashboardDeviceIds.map((id) => (
                        <button
                          key={`fleet-api-${id}`}
                          type="button"
                          onClick={() => {
                            onSelect(id)
                            closeFleetModal()
                          }}
                          style={{
                            textAlign: "left",
                            borderRadius: 10,
                            border: `1px solid ${borderColor}`,
                            background: cardBackground,
                            color: textPrimary,
                            padding: "8px 10px",
                            cursor: "pointer",
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 13),
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    {dashboardDeviceListError ? (
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: `1px solid ${borderColor}`,
                          background: withAlpha(cardBackground, 0.95),
                          color: textPrimary,
                          ...bodyFont,
                          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                        }}
                      >
                        <span style={{ color: statusWarning }}>
                          {ui.fleetDeviceListApiError}
                        </span>
                        <span
                          style={{
                            display: "block",
                            marginTop: 6,
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 11),
                            color: textSecondary,
                            wordBreak: "break-word",
                          }}
                        >
                          {dashboardDeviceListError}
                        </span>
                      </div>
                    ) : null}
                    {fleetGroupsByMap.map((group) => (
                  <div
                    key={`fleet-group-${group.mapId}`}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${borderColor}`,
                      background: withAlpha(cardBackground, 0.95),
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${borderColor}`,
                        background: panelBackground,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: textPrimary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.mapId}
                      </span>
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {group.devices.length}대
                      </span>
                    </div>
                    <div
                      style={{
                        padding: 10,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {group.devices.map((d) => (
                        <button
                          key={`fleet-${group.mapId}-${d.id}`}
                          type="button"
                          onClick={() => {
                            onSelect(d.id)
                            closeFleetModal()
                          }}
                          style={{
                            textAlign: "left",
                            borderRadius: 10,
                            border: `1px solid ${borderColor}`,
                            background: cardBackground,
                            color: textPrimary,
                            padding: "8px 10px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              ...bodyFont,
                              fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.id}
                          </span>
                          <span
                            style={{
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              color: textSecondary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.mode ?? d.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {onlineOfflineModalOpen ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={ui.onlineOfflineModalTitle}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeOnlineOfflineModal()
            }}
          >
            <div
              style={{
                width: "min(980px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...headingFont,
                    fontSize: coerceFontSize(headingFont?.fontSize, 18),
                    color: textPrimary,
                  }}
                >
                  {ui.onlineOfflineModalTitle}
                </div>
                <button
                  type="button"
                  onClick={closeOnlineOfflineModal}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.close}
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ ...monoFont, color: statusOnline }}>
                      온라인
                    </span>
                    <span style={{ ...monoFont, color: textSecondary }}>
                      {onlineOfflineLists.online.length}대
                    </span>
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto", padding: 10 }}>
                    {onlineOfflineLists.online.map((d) => (
                      <button
                        key={`on-${d.id}`}
                        type="button"
                        onClick={() => {
                          onSelect(d.id)
                          closeOnlineOfflineModal()
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 10,
                          border: `1px solid ${borderColor}`,
                          background: panelBackground,
                          color: textPrimary,
                          padding: "8px 10px",
                          cursor: "pointer",
                          marginBottom: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span style={{ ...bodyFont }}>{d.id}</span>
                        <span style={{ ...monoFont, color: textSecondary }}>
                          {d.mapId ?? d.site}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ ...monoFont, color: statusOffline }}>
                      {ui.onlineOfflineOfflineLabel}
                    </span>
                    <span style={{ ...monoFont, color: textSecondary }}>
                      {onlineOfflineLists.offline.length}대
                    </span>
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto", padding: 10 }}>
                    {onlineOfflineLists.offline.map((d) => (
                      <button
                        key={`off-${d.id}`}
                        type="button"
                        onClick={() => {
                          onSelect(d.id)
                          closeOnlineOfflineModal()
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 10,
                          border: `1px solid ${borderColor}`,
                          background: panelBackground,
                          color: textPrimary,
                          padding: "8px 10px",
                          cursor: "pointer",
                          marginBottom: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span style={{ ...bodyFont }}>{d.id}</span>
                        <span style={{ ...monoFont, color: textSecondary }}>
                          {d.mapId ?? d.site}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                </div>

              </div>
            </div>
          </div>
        ) : null}

        {throughputModalOpen ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 57,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="생산량 지표"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeThroughputModal()
            }}
          >
            <div
              style={{
                width: "min(920px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...headingFont,
                    fontSize: coerceFontSize(headingFont?.fontSize, 18),
                    color: textPrimary,
                  }}
                >
                  {ui.kpiAvgTemp}
                </div>
                <button
                  type="button"
                  onClick={closeThroughputModal}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.close}
                </button>
              </div>

              <div style={{ padding: 14, overflow: "auto", display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      label: "최근 15분 생산량",
                      value: throughputData?.current15MinCount ?? 0,
                    },
                    {
                      label: "시간당 환산 생산률",
                      value: throughputData?.hourlyRate ?? 0,
                    },
                    {
                      label: "오늘 총 생산량",
                      value: throughputData?.todayCount ?? 0,
                    },
                    {
                      label: "이전 15분 대비",
                      value: `${(throughputData?.changeRate ?? 0).toFixed(2)}%`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${borderColor}`,
                        background: cardBackground,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: textSecondary,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          ...headingFont,
                          fontSize: coerceFontSize(headingFont?.fontSize, 20),
                          color: textPrimary,
                        }}
                      >
                        {typeof item.value === "number"
                          ? item.value.toLocaleString()
                          : item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        ...headingFont,
                        fontSize: coerceFontSize(headingFont?.fontSize, 15),
                        color: textPrimary,
                      }}
                    >
                      시간 흐름 추세
                    </span>
                    <span
                      style={{
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        color: textSecondary,
                      }}
                    >
                      기준 시간: {throughputBucketTimeLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      minHeight: throughputPlot.height,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: throughputPlot.width,
                        aspectRatio: `${throughputPlot.width} / ${throughputPlot.height}`,
                      }}
                    >
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${throughputPlot.width} ${throughputPlot.height}`}
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="Throughput time-count chart"
                      >
                        <path
                          d={`M ${throughputPlot.padLeft},${throughputPlot.padTop} V ${throughputPlot.height - throughputPlot.padBottom} H ${throughputPlot.width - throughputPlot.padRight}`}
                          stroke={withAlpha(borderColor, 0.85)}
                          strokeWidth={1.2}
                          fill="none"
                        />
                        {throughputPlot.yTicks.map((t, idx) => (
                          <g key={`y-${idx}`}>
                            <path
                              d={`M ${throughputPlot.padLeft},${t.y} H ${throughputPlot.width - throughputPlot.padRight}`}
                              stroke={withAlpha(borderColor, 0.4)}
                              strokeWidth={1}
                              fill="none"
                            />
                            <text
                              x={throughputPlot.padLeft - 8}
                              y={t.y + 4}
                              textAnchor="end"
                              style={{
                                fill: textSecondary,
                                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                                fontFamily: monoFont?.fontFamily,
                              }}
                            >
                              {Math.round(t.value).toLocaleString()}
                            </text>
                          </g>
                        ))}
                        {throughputPlot.areaPath ? (
                          <path
                            d={throughputPlot.areaPath}
                            fill={withAlpha(accent, 0.14)}
                            stroke="none"
                          />
                        ) : null}
                        {throughputPlot.points ? (
                          <polyline
                            points={throughputPlot.points}
                            fill="none"
                            stroke={accent}
                            strokeWidth={2.25}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ) : null}
                        {throughputPlot.xTicks.map((t, idx) => (
                          <g key={`x-${idx}`}>
                            <path
                              d={`M ${t.x},${throughputPlot.height - throughputPlot.padBottom} V ${throughputPlot.height - throughputPlot.padBottom + 4}`}
                              stroke={withAlpha(borderColor, 0.85)}
                              strokeWidth={1}
                              fill="none"
                            />
                            <text
                              x={t.x}
                              y={throughputPlot.height - throughputPlot.padBottom + 18}
                              textAnchor="middle"
                              style={{
                                fill: textSecondary,
                                fontSize: coerceFontSize(monoFont?.fontSize, 10),
                                fontFamily: monoFont?.fontFamily,
                              }}
                            >
                              {t.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                      {throughputSeries.length ? (
                        <>
                          <span
                            style={{
                              position: "absolute",
                              right: 8,
                              top: 2,
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 11),
                              color: textPrimary,
                              background: withAlpha(accent, 0.16),
                              border: `1px solid ${withAlpha(accent, 0.42)}`,
                              padding: "2px 6px",
                              borderRadius: 6,
                            }}
                          >
                            now {Math.round(throughputStats.current).toLocaleString()} @ {throughputStats.currentTime}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {!throughputSeries.length ? (
                    <div
                      style={{
                        ...bodyFont,
                        fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                        color: textSecondary,
                      }}
                    >
                      throughput chart 데이터가 아직 없습니다.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {uptimeModalOpen ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 57,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={ui.uptimeTitle}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeUptimeModal()
            }}
          >
            <div
              style={{
                width: "min(880px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...headingFont,
                    fontSize: coerceFontSize(headingFont?.fontSize, 18),
                    color: textPrimary,
                  }}
                >
                  {ui.uptimeTitle}
                </div>
                <button
                  type="button"
                  onClick={closeUptimeModal}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.close}
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  overflow: "auto",
                  display: "grid",
                  gap: 12,
                }}
              >
                {utilizationLoading ? (
                  <div
                    style={{
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                      color: textSecondary,
                    }}
                  >
                    {ui.uptimeLoading}
                  </div>
                ) : null}
                {utilizationError ? (
                  <div
                    style={{
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                      color: statusError,
                    }}
                  >
                    {utilizationError}
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(
                    [
                      {
                        key: "all",
                        label: `${ui.uptimeAll} (${uptimeCounts.total})`,
                        color: textSecondary,
                      },
                      {
                        key: "normal",
                        label: `${ui.uptimeNormal} (${uptimeCounts.normal})`,
                        color: statusOnline,
                      },
                      {
                        key: "caution",
                        label: `${ui.uptimeCaution} (${uptimeCounts.caution})`,
                        color: statusWarning,
                      },
                      {
                        key: "warning",
                        label: `${ui.uptimeWarning} (${uptimeCounts.warning})`,
                        color: statusError,
                      },
                    ] as Array<{
                      key: "all" | "normal" | "caution" | "warning"
                      label: string
                      color: string
                    }>
                  ).map((b) => {
                    const active = uptimeFilter === b.key
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() =>
                          startTransition(() => setUptimeFilter(b.key))
                        }
                        style={{
                          border: `1px solid ${active ? b.color : borderColor}`,
                          background: active
                            ? withAlpha(b.color, 0.18)
                            : cardBackground,
                          color: active ? b.color : textPrimary,
                          borderRadius: 999,
                          padding: "6px 12px",
                          cursor: "pointer",
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: b.color,
                            display: "inline-block",
                          }}
                        />
                        {b.label}
                      </button>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    {
                      label: ui.uptimeNormal,
                      value: uptimeCounts.normal,
                      color: statusOnline,
                      hint: "≥ 95%",
                    },
                    {
                      label: ui.uptimeCaution,
                      value: uptimeCounts.caution,
                      color: statusWarning,
                      hint: "80 ~ 95%",
                    },
                    {
                      label: ui.uptimeWarning,
                      value: uptimeCounts.warning,
                      color: statusError,
                      hint: "< 80%",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${borderColor}`,
                        background: cardBackground,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: textSecondary,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: s.color,
                            display: "inline-block",
                          }}
                        />
                        {s.label}
                        <span style={{ color: textSecondary }}>
                          · {s.hint}
                        </span>
                      </span>
                      <span
                        style={{
                          ...headingFont,
                          fontSize: coerceFontSize(headingFont?.fontSize, 22),
                          color: s.color,
                        }}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {uptimeFilteredRows.length === 0 ? (
                    <div
                      style={{
                        ...bodyFont,
                        fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                        color: textSecondary,
                      }}
                    >
                      {ui.uptimeEmpty}
                    </div>
                  ) : (
                    uptimeFilteredRows.map((row) => {
                      const color = uptimeLevelColor(row.level)
                      const label = uptimeLevelLabel(row.level)
                      return (
                        <div
                          key={row.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(120px, 1.1fr) 1fr auto auto",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              color: textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {row.id}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: 10,
                              borderRadius: 999,
                              background: withAlpha(borderColor, 0.6),
                              overflow: "hidden",
                              position: "relative",
                            }}
                            aria-label={`${row.id} uptime ${row.pct.toFixed(
                              1
                            )}%`}
                          >
                            <div
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, row.pct)
                                )}%`,
                                height: "100%",
                                background: color,
                                transition: "width 200ms ease",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              color: textPrimary,
                              minWidth: 56,
                              textAlign: "right",
                            }}
                          >
                            {row.pct.toFixed(1)}%
                          </span>
                          <span
                            style={{
                              border: `1px solid ${color}`,
                              color,
                              background: withAlpha(color, 0.12),
                              borderRadius: 999,
                              padding: "2px 10px",
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 11),
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {outageModalOpen ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 57,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: withAlpha(background, 0.72),
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="장애 이벤트 목록"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeOutageModal()
            }}
          >
            <div
              style={{
                width: "min(980px, 100%)",
                maxHeight: "100%",
                overflow: "hidden",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 14,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    ...headingFont,
                    fontSize: coerceFontSize(headingFont?.fontSize, 18),
                    color: textPrimary,
                  }}
                >
                  장애 이벤트 목록 ({outageModalEventRows.length})
                </div>
                <button
                  type="button"
                  onClick={closeOutageModal}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  닫기
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {outageModalLoading ? (
                  <div
                    style={{
                      padding: 14,
                      color: textSecondary,
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    }}
                  >
                    {ui.outageModalLoading}
                  </div>
                ) : outageModalError ? (
                  <div
                    style={{
                      padding: 14,
                      color: textPrimary,
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    }}
                  >
                    <span style={{ color: statusWarning }}>
                      {ui.outageModalLoadError}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 11),
                        color: textSecondary,
                        wordBreak: "break-word",
                      }}
                    >
                      {outageModalError}
                    </span>
                  </div>
                ) : outageModalEventRows.length === 0 ? (
                  <div
                    style={{
                      padding: 14,
                      color: textSecondary,
                      ...bodyFont,
                      fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    }}
                  >
                    이벤트 데이터가 없습니다.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {(
                        [
                          {
                            key: "CRITICAL" as const,
                            label: ui.outageSeverityCritical,
                            color: statusError,
                          },
                          {
                            key: "WARNING" as const,
                            label: ui.outageSeverityWarning,
                            color: statusWarning,
                          },
                          {
                            key: "INFO" as const,
                            label: ui.outageSeverityInfo,
                            color: statusOnline,
                          },
                          {
                            key: "UNKNOWN" as const,
                            label: ui.outageSeverityUnknown,
                            color: textSecondary,
                          },
                        ] as const
                      ).map((tab) => {
                        const count =
                          outageModalGroups.find((g) => g.severity === tab.key)
                            ?.rows.length ?? 0
                        const active = outageSeverityTab === tab.key
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() =>
                              startTransition(() => setOutageSeverityTab(tab.key))
                            }
                            style={{
                              border: `1px solid ${active ? tab.color : borderColor}`,
                              background: active
                                ? withAlpha(tab.color, 0.18)
                                : cardBackground,
                              color: active ? tab.color : textPrimary,
                              borderRadius: 999,
                              padding: "6px 12px",
                              cursor: "pointer",
                              ...monoFont,
                              fontSize: coerceFontSize(monoFont?.fontSize, 12),
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: tab.color,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            {tab.label} ({count})
                          </button>
                        )
                      })}
                    </div>

                    <div
                      role="table"
                      aria-label="장애 이벤트 목록"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: `1px solid ${borderColor}`,
                        background: panelBackground,
                      }}
                    >
                      <div
                        role="row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr 0.95fr 1.55fr",
                          gap: 10,
                          padding: "10px 12px",
                          borderBottom: `1px solid ${borderColor}`,
                          color: textSecondary,
                          background: withAlpha(cardBackground, 0.6),
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        }}
                      >
                        <span role="columnheader">{ui.outageColDevice}</span>
                        <span role="columnheader">{ui.outageColEvent}</span>
                        <span role="columnheader">{ui.outageColSeverity}</span>
                        <span role="columnheader">{ui.outageColTime}</span>
                      </div>
                      <div
                        role="rowgroup"
                        style={{ maxHeight: 420, overflow: "auto" }}
                      >
                        {outageModalActiveRows.length === 0 ? (
                          <div
                            style={{
                              padding: 14,
                              color: textSecondary,
                              ...bodyFont,
                              fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                            }}
                          >
                            {ui.outageEmptyTab}
                          </div>
                        ) : (
                          outageModalActiveRows.map((row) => {
                            const sev = row.severity.toUpperCase()
                            const sevColor =
                              sev === "CRITICAL" || sev === "ERROR"
                                ? statusError
                                : sev === "WARN" || sev === "WARNING"
                                  ? statusWarning
                                  : textSecondary
                            return (
                              <button
                                key={`outage-${outageSeverityTab}-${row.deviceId}-${row.ts}-${row.eventType}`}
                                type="button"
                                onClick={() => {
                                  openEventDetail(row)
                                  closeOutageModal()
                                }}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  background: cardBackground,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  padding: 0,
                                }}
                              >
                                <div
                                  role="row"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "1.2fr 1fr 0.95fr 1.55fr",
                                    gap: 10,
                                    padding: "10px 12px",
                                    borderBottom: `1px solid ${borderColor}`,
                                  }}
                                >
                                  <span
                                    role="cell"
                                    style={{ ...monoFont, color: textPrimary }}
                                  >
                                    {row.deviceId}
                                  </span>
                                  <span
                                    role="cell"
                                    style={{ ...monoFont, color: textPrimary }}
                                  >
                                    {row.eventType}
                                  </span>
                                  <span
                                    role="cell"
                                    style={{ ...monoFont, color: sevColor }}
                                  >
                                    {row.severity}
                                  </span>
                                  <span
                                    role="cell"
                                    style={{ ...monoFont, color: textSecondary }}
                                  >
                                    {formatKoreanRelativeTime(row.ts).replace(
                                      " 전",
                                      "전"
                                    )}
                                  </span>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <EventDetailModal
          open={eventDetailOpen}
          event={selectedOutageEvent}
          device={eventDetailDevice}
          deviceEvents={
            selectedOutageEvent
              ? deviceEvents[selectedOutageEvent.deviceId] ?? []
              : []
          }
          isDeviceOffline={
            selectedOutageEvent
              ? wsOfflineDeviceIds.includes(selectedOutageEvent.deviceId) ||
                eventDetailDevice?.status === "Offline"
              : false
          }
          ack={selectedEventAck}
          language={language}
          background={background}
          panelBackground={panelBackground}
          cardBackground={cardBackground}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          statusOnline={statusOnline}
          statusOffline={statusOffline}
          statusWarning={statusWarning}
          statusError={statusError}
          accent={accent}
          headingFont={headingFont}
          bodyFont={bodyFont}
          monoFont={monoFont}
          onClose={closeEventDetail}
          onAck={handleEventAck}
          onResolve={handleEventResolve}
          onViewDevice={handleViewDeviceFromEvent}
        />

        {chatOpen && enableChat ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 60,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              padding: 16,
              background: withAlpha(background, 0.35),
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={ui.chat}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeChat()
            }}
          >
            <div
              style={{
                width: "min(420px, 100%)",
                height: "min(540px, 100%)",
                borderRadius: 16,
                background: panelBackground,
                border: `1px solid ${borderColor}`,
                boxShadow: `0 18px 70px ${withAlpha("#000", 0.55)}`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 12,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: withAlpha(accent, 0.85),
                      boxShadow: `0 0 0 3px ${withAlpha(accent, 0.18)}`,
                    }}
                  />
                  <div
                    style={{
                      ...headingFont,
                      fontSize: coerceFontSize(headingFont?.fontSize, 15),
                      lineHeight: headingFont?.lineHeight ?? "1.1em",
                      letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
                      color: textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {chatTitle}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeChat}
                  aria-label={ui.close}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  }}
                >
                  {ui.close}
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {chatMessages.map((m, idx) => {
                  const isUser = m.role === "user"
                  const bubbleBg = isUser
                    ? withAlpha(accent, 0.18)
                    : cardBackground
                  const bubbleBorder = isUser
                    ? withAlpha(accent, 0.25)
                    : borderColor
                  return (
                    <div
                      key={`${m.role}-${idx}-${m.ts}`}
                      style={{
                        display: "flex",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "92%",
                          borderRadius: 14,
                          padding: "10px 12px",
                          background: bubbleBg,
                          border: `1px solid ${bubbleBorder}`,
                          color: textPrimary,
                        }}
                      >
                        <div
                          style={{
                            ...bodyFont,
                            fontSize: coerceFontSize(bodyFont?.fontSize, 13),
                            lineHeight: bodyFont?.lineHeight ?? "1.35em",
                            letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                          }}
                        >
                          {m.text}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            ...monoFont,
                            fontSize: coerceFontSize(monoFont?.fontSize, 11),
                            color: textSecondary,
                            textAlign: isUser ? "right" : "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.ts}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  padding: 12,
                  borderTop: `1px solid ${borderColor}`,
                  display: "flex",
                  gap: 10,
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) =>
                    startTransition(() => setChatInput(e.target.value))
                  }
                  placeholder={chatPlaceholder}
                  aria-label={ui.chat}
                  style={{
                    flex: 1,
                    border: `1px solid ${borderColor}`,
                    background: cardBackground,
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "10px 12px",
                    outline: "none",
                    ...bodyFont,
                    fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      sendChat()
                    }
                    if (e.key === "Escape") {
                      e.preventDefault()
                      closeChat()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  aria-label={ui.send}
                  style={{
                    border: `1px solid ${withAlpha(accent, 0.35)}`,
                    background: withAlpha(accent, 0.18),
                    color: textPrimary,
                    borderRadius: 12,
                    padding: "10px 12px",
                    cursor: "pointer",
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 12),
                    whiteSpace: "nowrap",
                  }}
                >
                  {ui.send}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

function getMissionColor(mission: string, fallback: string): string {
  const text = mission.trim().toUpperCase()
  if (!text || text === "-") return fallback
  if (text === "IDLE") return "#A39F74"
  if (text === "PICK") return "#8B5CF6"
  if (text === "PACK") return "#F59E0B"
  if (text === "MOVE") return "#3B82F6"
  if (text === "CHARGE") return "#22C55E"
  if (text === "UNKNOWN") return "#EF4444"
  return fallback
}
