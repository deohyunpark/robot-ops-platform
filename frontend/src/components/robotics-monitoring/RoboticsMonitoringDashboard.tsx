import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
import { useElementInView } from "./useElementInView"
import {
  clamp,
  coerceFontSize,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

const isStatic = false

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
    devices,
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
    initialSelectedId,
    style,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useElementInView(containerRef, { amount: 0.2 })

  const [selectedId, setSelectedId] = useState<string>(
    () => initialSelectedId || (devices?.[0]?.id ?? "")
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
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

  const ui = useMemo(() => {
    const ko = language === "ko"
    return {
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
      lastSeen: ko ? "마지막" : "Last seen",
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
      const first = devices?.[0]?.id ?? ""
      if (first) startTransition(() => setSelectedId(first))
    }
    if (selectedId && devices?.length) {
      const exists = devices.some((d) => d.id === selectedId)
      if (!exists) startTransition(() => setSelectedId(devices[0].id))
    }
  }, [devices, selectedId])

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
    if (!enableRealtimeSimulation || isStatic) return devices

    const t = tick
    return devices.map((d, idx) => {
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
    devices,
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
    const online = derivedDevices.filter((d) => d.status === "Online").length
    const offline = derivedDevices.filter(
      (d) => d.status === "Offline"
    ).length
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
  }, [derivedDevices])

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

  const onSelect = useCallback((id: string) => {
    startTransition(() => {
      setSelectedId(id)
      setModalOpen(true)
    })
  }, [])

  const closeModal = useCallback(() => {
    startTransition(() => setModalOpen(false))
  }, [])

  const openChat = useCallback(() => {
    startTransition(() => setChatOpen(true))
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
    statusColor,
    statusError,
    statusWarning,
    textPrimary,
    textSecondary,
    ui: ui as Record<string, string>,
  })

  const logs = useMemo(() => {
    if (!selected) return []
    const base = [
      {
        t: "Telemetry",
        msg: `Heartbeat OK • latency ${clamp(24 + ((selected.id.length * 3) % 60), 12, 120)}ms`,
        sev: "info" as const,
      },
      {
        t: "Power",
        msg: `Battery ${Math.round(selected.battery)}% • discharge ${clamp(6 + (selected.model.length % 9), 4, 18)}W`,
        sev:
          selected.battery <= lowBatteryThreshold
            ? ("warn" as const)
            : ("info" as const),
      },
      {
        t: "Thermal",
        msg: `Core temp ${formatTemp(selected.temperature)} • threshold ${formatTemp(abnormalTempThreshold)}`,
        sev:
          selected.temperature >= abnormalTempThreshold
            ? ("error" as const)
            : ("info" as const),
      },
      {
        t: "Safety",
        msg: selected.emergency
          ? "Emergency stop triggered • operator intervention required"
          : "Safety system nominal",
        sev: selected.emergency ? ("error" as const) : ("info" as const),
      },
      {
        t: "Diagnostics",
        msg: `Error rate ${selected.errorRate.toFixed(1)}% • last 15m window`,
        sev:
          selected.errorRate >= 6
            ? ("error" as const)
            : selected.errorRate >= 2.5
              ? ("warn" as const)
              : ("info" as const),
      },
    ]

    const extraA = {
      t: "Comms",
      msg:
        selected.status === "Offline"
          ? `Disconnected • last seen ${Math.round(selected.lastSeenMinutes)}m ago`
          : `Link stable • RSSI ${clamp(-58 - (selected.name.length % 18), -92, -45)} dBm`,
      sev:
        selected.status === "Offline"
          ? ("error" as const)
          : ("info" as const),
    }
    const extraB = {
      t: "Ops",
      msg:
        selected.status === "Maintenance"
          ? "Maintenance mode enabled • motion locked"
          : selected.status === "Error"
            ? "Auto-recovery attempted • escalation queued"
            : "Task queue nominal • no pending escalations",
      sev:
        selected.status === "Error"
          ? ("error" as const)
          : selected.status === "Warning"
            ? ("warn" as const)
            : ("info" as const),
    }

    const all = [...base, extraA, extraB].slice(0, 8)

    const rank = (sev: "info" | "warn" | "error") =>
      sev === "error" ? 0 : sev === "warn" ? 1 : 2
    all.sort((a, b) => rank(a.sev) - rank(b.sev))

    return all.map((x, idx) => {
      const minute = clamp(((tick + idx * 9) % 59) + 1, 1, 59)
      const stamp =
        selected.status === "Offline" ? `-${minute}m` : `${minute}m ago`
      return { ...x, stamp }
    })
  }, [selected, abnormalTempThreshold, lowBatteryThreshold, tick])

  const leftTitle = useMemo(() => {
    if (!selected) return "No device selected"
    return `${selected.name}`
  }, [selected])

  const rightSub = useMemo(() => {
    if (!selected) return ""
    return `${selected.site} • ${selected.model} • ${selected.id}`
  }, [selected])

  const currentLocation = useMemo(() => {
    if (!selected) return ""
    const zone = String.fromCharCode(65 + (selected.id.length % 6))
    const aisle = 1 + ((selected.name.length + selected.model.length) % 18)
    const bay =
      1 +
      ((selected.id.charCodeAt(0) +
        selected.id.charCodeAt(selected.id.length - 1)) %
        10)
    return `${selected.site} • Zone ${zone} • Aisle ${aisle} • Bay ${bay}`
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
        detail: commsState === "error" ? "Disconnected" : "Stable link",
      },
      {
        label: "Thermal",
        state: thermalState,
        detail: `Core ${formatTemp(selected.temperature)}`,
      },
      {
        label: "Power",
        state: powerState,
        detail: `Battery ${Math.round(selected.battery)}%`,
      },
      {
        label: "Safety",
        state: safetyState,
        detail: safetyState === "error" ? "E-Stop" : "Nominal",
      },
      {
        label: "Diagnostics",
        state: diagState,
        detail: `Err ${selected.errorRate.toFixed(1)}%`,
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

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modalOpen, closeModal])

  const isFixedWidth = style && style.width === "100%"
  const isFixedHeight = style && style.height === "100%"

  return (
    <div
      ref={containerRef}
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
          {enableChat && (
            <button
              type="button"
              onClick={openChat}
              aria-label={ui.chat}
              style={{
                border: `1px solid ${borderColor}`,
                background: cardBackground,
                color: textPrimary,
                borderRadius: 12,
                padding: "10px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                ...monoFont,
                fontSize: coerceFontSize(monoFont?.fontSize, 12),
                lineHeight: monoFont?.lineHeight ?? "1em",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 14c0 1.1-.9 2-2 2H9l-4 4V6c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v8Z"
                  stroke={textSecondary}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 9h7M9 12h5"
                  stroke={textSecondary}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
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
                  ...headingFont,
                  fontSize: coerceFontSize(headingFont?.fontSize, 18),
                  lineHeight: headingFont?.lineHeight ?? "1.1em",
                  letterSpacing: headingFont?.letterSpacing ?? "-0.03em",
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
                {groupBySite ? ui.groupedBySite : ui.flatList} {ui.selectRow}
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
              {statusPill("Online")}
              {statusPill("Warning")}
              {statusPill("Error")}
              {statusPill("Offline")}
              {statusPill("Maintenance")}
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
        </section>

        {showDetailPanel && (
          <aside
            aria-label="Device detail panel"
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
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
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
                    {leftTitle}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      ...monoFont,
                      fontSize: coerceFontSize(monoFont?.fontSize, 12),
                      color: textSecondary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {rightSub}
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
                  {selected ? (
                    <>
                      <Badge
                        label={selected.emergency ? "Emergency" : "Normal"}
                        color={
                          selected.emergency ? statusError : textSecondary
                        }
                        font={monoFont}
                      />
                      <span>{statusPill(selected.status)}</span>
                    </>
                  ) : null}
                </div>
              </div>

              {selected ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <MetricCard
                    label="Battery"
                    value={`${Math.round(selected.battery)}%`}
                    hint={
                      selected.battery <= lowBatteryThreshold
                        ? "Low battery"
                        : "Nominal"
                    }
                    color={
                      selected.battery <= lowBatteryThreshold
                        ? statusWarning
                        : accent
                    }
                    bg={cardBackground}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label="Temperature"
                    value={`${Math.round(selected.temperature)}°C`}
                    hint={
                      selected.temperature >= abnormalTempThreshold
                        ? "Over threshold"
                        : "Stable"
                    }
                    color={
                      selected.temperature >= abnormalTempThreshold
                        ? statusError
                        : accent
                    }
                    bg={cardBackground}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label="Error Rate"
                    value={`${selected.errorRate.toFixed(1)}%`}
                    hint={
                      selected.errorRate >= 6
                        ? "High"
                        : selected.errorRate >= 2.5
                          ? "Elevated"
                          : "Normal"
                    }
                    color={
                      selected.errorRate >= 2.5 ? statusError : accent
                    }
                    bg={cardBackground}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label="Last Seen"
                    value={
                      selected.status === "Offline"
                        ? `${Math.round(selected.lastSeenMinutes)}m`
                        : "Now"
                    }
                    hint={
                      selected.status === "Offline"
                        ? "Disconnected"
                        : "Streaming telemetry"
                    }
                    color={
                      selected.status === "Offline"
                        ? statusOffline
                        : statusOnline
                    }
                    bg={cardBackground}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: cardBackground,
                    border: `1px solid ${borderColor}`,
                    color: textSecondary,
                    ...bodyFont,
                    fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                  }}
                >
                  Select a device to view details.
                </div>
              )}
            </div>

            <div
              style={{
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0,
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
                role="log"
                aria-label="Recent device logs"
                style={{
                  minHeight: 0,
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingRight: 2,
                }}
              >
                {logs.map((l, idx) => {
                  const sevColor =
                    l.sev === "error"
                      ? statusError
                      : l.sev === "warn"
                        ? statusWarning
                        : textSecondary
                  return (
                    <div
                      key={`${l.t}-${idx}`}
                      style={{
                        borderRadius: 12,
                        background: cardBackground,
                        border: `1px solid ${borderColor}`,
                        padding: 12,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: sevColor,
                          boxShadow: `0 0 0 3px ${withAlpha(sevColor, 0.14)}`,
                          marginTop: 4,
                          flex: "0 0 auto",
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: 10,
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
                            {l.t}
                          </span>
                          <span
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
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            ...bodyFont,
                            fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                            lineHeight: bodyFont?.lineHeight ?? "1.35em",
                            letterSpacing:
                              bodyFont?.letterSpacing ?? "-0.01em",
                            color: textSecondary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {l.msg}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
                        {Math.round(selected.battery)}%
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
