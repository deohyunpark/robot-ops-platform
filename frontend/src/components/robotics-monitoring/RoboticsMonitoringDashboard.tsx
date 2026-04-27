import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createSocket } from "../../services/ws"
import { useDeviceTableRenderer } from "./DashboardDeviceTable"
import {
  Badge,
  BatteryGauge,
  FilterChip,
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
  eventBatchFromPayload,
  resolveEventDeviceId,
  telemetryBatchToDevices,
} from "./telemetryAdapter"
import type { BackendDeviceEvent } from "./telemetryAdapter"
import { useElementInView } from "./useElementInView"
import {
  clamp,
  coerceFontSize,
  formatBattery,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

const isStatic = false
const DAISY_LOGO_SRC = "/daisy-logo.png?v=2"

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
    showSearch,
    showKPIs,
    showFilters,
    showDetailPanel,
    style,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useElementInView(containerRef, { amount: 0.2 })

  const [selectedId, setSelectedId] = useState<string>("")
  const [modalOpen, setModalOpen] = useState(false)
  const [fleetModalOpen, setFleetModalOpen] = useState(false)
  const [onlineOfflineModalOpen, setOnlineOfflineModalOpen] = useState(false)
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
  const [search, setSearch] = useState("")
  const [tick, setTick] = useState(0)
  const [liveDevices, setLiveDevices] = useState<Device[] | null>(null)
  const [deviceEvents, setDeviceEvents] = useState<Record<string, BackendDeviceEvent[]>>({})
  const [wsConnected, setWsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const fleetHoverCloseTimerRef = useRef<number | null>(null)
  const deviceSource = useMemo(() => liveDevices ?? [], [liveDevices])

  useEffect(() => {
    const socket = createSocket((payload) => {
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
      kpiAvgBattery: ko ? "평균 배터리" : "Avg Battery",
      kpiAvgTemp: ko ? "평균 온도" : "Avg Temp",
      kpiErrorRate: ko ? "에러율" : "Error Rate",
      kpiEmergency: ko ? "긴급 알림" : "Emergency Alerts",
      hintAllUnits: ko ? "등록된 전체 장비" : "All registered units",
      hintRolling: ko ? "최근 15분" : "Rolling 15m",
      filtersLabel: ko ? "필터" : "Filters",
      filterOffline: ko ? "오프라인" : "Offline",
      filterLowBattery: ko ? "저전력" : "Low battery",
      filterHot: ko ? "고온" : "Hot",
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
      robotId: ko ? "로봇 ID" : "Robot ID",
      model: ko ? "모델" : "Model",
      currentLocation: ko ? "현재 위치" : "Current location",
      sensorStatus: ko ? "센서 상태" : "Sensor status",
      batteryGauge: ko ? "배터리 게이지" : "Battery gauge",
      batteryHistory: ko ? "최근 배터리" : "Recent battery level",
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
    const offlineEventIds = new Set<string>()
    for (const [deviceId, list] of Object.entries(deviceEvents)) {
      const last = list[list.length - 1]
      if (!last) continue
      if ((last.eventType ?? "").toUpperCase().includes("OFFLINE")) {
        offlineEventIds.add(deviceId)
      }
    }
    const offline = derivedDevices.filter((d) => offlineEventIds.has(d.id)).length
    const online = Math.max(0, total - offline)
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
    }
  }, [derivedDevices, deviceEvents])

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
      if (s === "CRITICAL") return "#FF4D6D"
      if (s === "WARNING") return "#FFB020"
      if (s === "INFO") return "#60A5FA"
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
    const total = derivedDevices.length
    const offline = derivedDevices.filter((d) => d.status === "Offline").length
    const low = derivedDevices.filter((d) => d.battery <= lowBatteryThreshold).length
    const hot = derivedDevices.filter((d) => d.temperature >= abnormalTempThreshold).length
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
    const cpu = selected.cpuPct ?? selected.errorRate * 10
    const mem = selected.memPct ?? 0
    const speed = selected.speedMps ?? 0
    const lastSeq = selected.lastSeq ?? 0
    const errCode = selected.errorCode?.trim()
    const base = [
      {
        t: "Telemetry",
        msg: `시퀀스 ${lastSeq} • 속도 ${speed.toFixed(2)} m/s`,
        sev: "info" as const,
      },
      {
        t: "리소스",
        msg: `CPU ${cpu.toFixed(1)}% • MEM ${mem.toFixed(1)}%`,
        sev:
          cpu >= 90 || mem >= 90
            ? ("error" as const)
            : cpu >= 75 || mem >= 75
            ? ("warn" as const)
            : ("info" as const),
      },
      {
        t: "온도",
        msg: `코어 ${formatTemp(selected.temperature)} • 임계 ${formatTemp(abnormalTempThreshold)}`,
        sev:
          selected.temperature >= abnormalTempThreshold
            ? ("error" as const)
            : ("info" as const),
      },
      {
        t: "안전",
        msg: selected.emergency
          ? "비상 정지 감지 • 운영자 확인 필요"
          : selected.bumper
            ? "범퍼 이벤트 감지"
            : selected.obstacle
              ? "장애물 감지"
              : "안전 시스템 정상",
        sev: selected.emergency ? ("error" as const) : ("info" as const),
      },
      {
        t: "진단",
        msg: errCode
          ? `오류 코드 ${errCode}`
          : `에러율 ${selected.errorRate.toFixed(1)}% • 최근 15분`,
        sev:
          errCode
            ? ("error" as const)
            : selected.errorRate >= 6
            ? ("error" as const)
            : selected.errorRate >= 2.5
              ? ("warn" as const)
              : ("info" as const),
      },
    ]

    const extraA = {
      t: "통신",
      msg:
        selected.status === "Offline"
          ? `연결 끊김 • 마지막 수신 ${Math.round(selected.lastSeenMinutes)}분 전`
          : `링크 정상 • 마지막 수신 ${selected.updatedAt ?? selected.lastSeenAt ?? "N/A"}`,
      sev:
        selected.status === "Offline"
          ? ("error" as const)
          : ("info" as const),
    }
    const extraB = {
      t: "운영",
      msg:
        selected.mode?.toLowerCase() === "maintenance"
          ? "정비 모드 • 이동 제한"
          : selected.mission
            ? `미션 진행 중: ${selected.mission}`
            : "대기 중",
      sev:
        selected.status === "Error"
          ? ("error" as const)
          : selected.status === "Warning"
            ? ("warn" as const)
            : ("info" as const),
    }

    const eventLogs = (deviceEvents[selected.id] ?? []).slice(-3).map((ev) => ({
      t: `이벤트:${ev.eventType}`,
      msg: `${ev.severity} • seq ${ev.payload?.seq ?? "-"} • ${ev.payload?.ts ?? ev.createdAt ?? ""}`,
      sev:
        ev.severity === "CRITICAL" || ev.severity === "ERROR"
          ? ("error" as const)
          : ev.severity === "WARN" || ev.severity === "WARNING"
            ? ("warn" as const)
            : ("info" as const),
    }))

    const all = [...eventLogs, ...base, extraA, extraB].slice(0, 8)

    const rank = (sev: "info" | "warn" | "error") =>
      sev === "error" ? 0 : sev === "warn" ? 1 : 2
    all.sort((a, b) => rank(a.sev) - rank(b.sev))

    return all.map((x, idx) => {
      const minute = clamp(((tick + idx * 9) % 59) + 1, 1, 59)
      const stamp =
        selected.status === "Offline" ? `-${minute}m` : `${minute}m ago`
      return { ...x, stamp }
    })
  }, [selected, abnormalTempThreshold, tick, deviceEvents])

  const currentLocation = useMemo(() => {
    if (!selected) return ""
    const hasPos =
      typeof selected.posX === "number" &&
      typeof selected.posY === "number" &&
      typeof selected.theta === "number"
    if (hasPos) {
      return `${selected.site} • 맵 ${selected.mapId ?? "N/A"} • x:${selected.posX!.toFixed(2)} y:${selected.posY!.toFixed(2)} θ:${selected.theta!.toFixed(2)}`
    }
    return `${selected.site} • 위치 정보 없음`
  }, [selected])

  const sensorIndicators = useMemo(() => {
    if (!selected)
      return [] as {
        label: string
        state: "ok" | "warn" | "error"
        detail: string
      }[]
    const commsState = selected.status === "Offline" ? "error" : "ok"
    const thermalState =
      selected.temperature >= abnormalTempThreshold + 10
        ? "error"
        : selected.temperature >= abnormalTempThreshold
          ? "warn"
          : "ok"
    const powerState =
      selected.battery <= Math.max(2, lowBatteryThreshold * 0.5)
        ? "error"
        : selected.battery <= lowBatteryThreshold
          ? "warn"
          : "ok"
    const safetyState = selected.emergency ? "error" : "ok"
    const diagState =
      selected.errorRate >= 6
        ? "error"
        : selected.errorRate >= 2.5
          ? "warn"
          : "ok"

    return [
      {
        label: "Comms",
        state: commsState,
        detail:
          commsState === "error"
            ? "연결 끊김"
            : `속도 ${(selected.speedMps ?? 0).toFixed(2)} m/s`,
      },
      {
        label: "Thermal",
        state: thermalState,
        detail: `Core ${formatTemp(selected.temperature)}`,
      },
      {
        label: "Power",
        state: powerState,
        detail: `Battery ${formatBattery(selected.battery)}%`,
      },
      {
        label: "Safety",
        state: safetyState,
        detail: safetyState === "error" ? "비상정지" : "정상",
      },
      {
        label: "Diagnostics",
        state: diagState,
        detail: selected.errorCode
          ? `코드 ${selected.errorCode}`
          : `CPU ${(selected.cpuPct ?? 0).toFixed(1)}%`,
      },
    ]
  }, [selected, abnormalTempThreshold, lowBatteryThreshold])

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

  const onlineOfflineLists = useMemo(() => {
    const offlineSet = new Set<string>()
    for (const [deviceId, list] of Object.entries(deviceEvents)) {
      const last = list[list.length - 1]
      if (!last) continue
      if ((last.eventType ?? "").toUpperCase().includes("OFFLINE")) {
        offlineSet.add(deviceId)
      }
    }
    return {
      online: sortedFleetDevices.filter((d) => !offlineSet.has(d.id)),
      offline: sortedFleetDevices.filter((d) => offlineSet.has(d.id)),
    }
  }, [sortedFleetDevices, deviceEvents])

  useEffect(() => {
    if (!modalOpen && !fleetModalOpen && !onlineOfflineModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal()
        closeFleetModal()
        closeOnlineOfflineModal()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    modalOpen,
    fleetModalOpen,
    onlineOfflineModalOpen,
    closeModal,
    closeFleetModal,
    closeOnlineOfflineModal,
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
            value={`${kpis.total}`}
            hint={ui.hintAllUnits}
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
            value={`${kpis.online} / ${kpis.offline}`}
            hint={`${kpis.warning} warn • ${kpis.error} err`}
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
            value={`${Math.round(kpis.avgBattery)}%`}
            hint={`Low ≤ ${Math.round(lowBatteryThreshold)}%`}
            color={
              kpis.avgBattery <= lowBatteryThreshold
                ? statusWarning
                : accent
            }
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
          />
          <KPI
            title={ui.kpiAvgTemp}
            value={`${Math.round(kpis.avgTemp)}°C`}
            hint={`Hot ≥ ${Math.round(abnormalTempThreshold)}°C`}
            color={
              kpis.avgTemp >= abnormalTempThreshold ? statusError : accent
            }
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
          />
          <KPI
            title={ui.kpiErrorRate}
            value={`${kpis.avgErrorRate.toFixed(1)}%`}
            hint={ui.hintRolling}
            color={kpis.avgErrorRate >= 2.5 ? statusError : accent}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
          />
          <KPI
            title={ui.kpiEmergency}
            value={`${kpis.emergencies}`}
            hint="Requires attention"
            color={kpis.emergencies > 0 ? statusError : textSecondary}
            bg={cardBackground}
            border={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            titleFont={monoFont}
            valueFont={headingFont}
          />
        </section>
      )}

      {(showFilters || showSearch) && (
        <section
          aria-label={ui.filtersLabel}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: 12,
            borderRadius: 14,
            background: panelBackground,
            border: `1px solid ${borderColor}`,
            flexWrap: "wrap",
            boxSizing: "border-box",
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
            {showFilters && (
              <>
                <FilterChip
                  label={ui.filterOffline}
                  active={filterOffline}
                  color={statusOffline}
                  font={monoFont}
                />
                <FilterChip
                  label={`Low battery ≤ ${Math.round(lowBatteryThreshold)}%`}
                  active={filterLowBattery}
                  color={statusWarning}
                  font={monoFont}
                />
                <FilterChip
                  label={`Hot ≥ ${Math.round(abnormalTempThreshold)}°C`}
                  active={filterAbnormalTemp}
                  color={statusError}
                  font={monoFont}
                />
                <FilterChip
                  label={ui.filterEmergency}
                  active={filterEmergency}
                  color={statusError}
                  font={monoFont}
                />
              </>
            )}
            <span
              style={{
                marginLeft: 6,
                ...monoFont,
                fontSize: coerceFontSize(monoFont?.fontSize, 12),
                color: textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              {ui.showing} {filteredDevices.length}
              {ui.of} {derivedDevices.length}
            </span>
          </div>

          {showSearch && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: cardBackground,
                  border: `1px solid ${borderColor}`,
                  minWidth: 320,
                  maxWidth: 420,
                  width: "min(42vw, 420px)",
                  boxSizing: "border-box",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: withAlpha(accent, 0.6),
                    boxShadow: `0 0 0 3px ${withAlpha(accent, 0.15)}`,
                  }}
                />
                <input
                  value={search}
                  onChange={(e) =>
                    startTransition(() => setSearch(e.target.value))
                  }
                  placeholder={ui.searchPlaceholder}
                  aria-label="Search devices"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: textPrimary,
                    ...bodyFont,
                    fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    lineHeight: bodyFont?.lineHeight ?? "1.3em",
                    letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                  }}
                />
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={() => startTransition(() => setSearch(""))}
                    aria-label="Clear search"
                    style={{
                      border: `1px solid ${borderColor}`,
                      background: panelBackground,
                      color: textSecondary,
                      borderRadius: 10,
                      padding: "6px 8px",
                      cursor: "pointer",
                      ...monoFont,
                      fontSize: coerceFontSize(monoFont?.fontSize, 12),
                    }}
                  >
                    {ui.clear}
                  </button>
                ) : null}
              </div>
            </div>
          )}
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
                        label={ui.filterHot}
                        value={`${copilotInsights.hot}`}
                        hint={`≥ ${Math.round(abnormalTempThreshold)}°C`}
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
                    {ui.robotId}: {selected.id} • {ui.model}: {selected.model}
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
                                ? statusError
                                : l.sev === "warn"
                                  ? statusWarning
                                  : textSecondary
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
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
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

                      <div style={{ height: 96, width: "100%" }}>
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
                        />
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
                  등록된 전체 장비 ({sortedFleetDevices.length})
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
            aria-label="온라인 오프라인 장비 목록"
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
                  온라인 / 오프라인 장비 목록
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
                  닫기
                </button>
              </div>

              <div
                style={{
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  overflow: "auto",
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
                      오프라인 (이벤트 기준)
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
        ) : null}

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
