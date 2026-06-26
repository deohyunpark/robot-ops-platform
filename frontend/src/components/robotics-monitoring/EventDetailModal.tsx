import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Badge, BatteryGauge, MetricCard } from "./DashboardParts"
import type { Device } from "./roboticsMonitoringDashboardTypes"
import type { BackendDeviceEvent, DeviceEventFeedRow } from "./telemetryAdapter"
import {
  buildMissionTimeline,
  findMatchingBackendEvent,
  formatEventDurationLabel,
  formatEventPayloadMessage,
  type EventDetailAckState,
} from "./eventDetailUtils"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import {
  coerceFontSize,
  formatBattery,
  formatKoreanDateTime,
  formatKoreanRelativeTime,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

export type EventDetailModalProps = {
  open: boolean
  event: DeviceEventFeedRow | null
  device: Device | null
  deviceEvents: BackendDeviceEvent[]
  isDeviceOffline: boolean
  ack: EventDetailAckState
  language: "ko" | "en"
  background: string
  panelBackground: string
  cardBackground: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  statusOnline: string
  statusOffline: string
  statusWarning: string
  statusError: string
  accent: string
  headingFont: RoboticsDashboardFont
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  onClose: () => void
  onAck: (assignee: string) => void
  onResolve: () => void
  onViewDevice: () => void
}

function severityColor(severity: string, colors: {
  error: string
  warning: string
  secondary: string
}) {
  const s = severity.toUpperCase()
  if (s === "CRITICAL" || s === "ERROR") return colors.error
  if (s === "WARN" || s === "WARNING") return colors.warning
  if (s === "INFO") return "#3B82F6"
  return colors.secondary
}

export function EventDetailModal(props: EventDetailModalProps) {
  const {
    open,
    event,
    device,
    deviceEvents,
    isDeviceOffline,
    ack,
    language,
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
    accent,
    headingFont,
    bodyFont,
    monoFont,
    onClose,
    onAck,
    onResolve,
    onViewDevice,
  } = props

  const ko = language === "ko"
  const [assigneeInput, setAssigneeInput] = useState("")
  const [durationTick, setDurationTick] = useState(0)

  useEffect(() => {
    if (!open) return
    setAssigneeInput(ack.assignee || "")
    const id = window.setInterval(() => setDurationTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [open, ack.assignee])

  const backendEvent = useMemo(() => {
    if (!event) return null
    return findMatchingBackendEvent(deviceEvents, event)
  }, [deviceEvents, event])

  const payloadMessage = useMemo(() => {
    if (!event) return ""
    return formatEventPayloadMessage(event, backendEvent, language)
  }, [event, backendEvent, language])

  const timeline = useMemo(() => {
    if (!event) return []
    return buildMissionTimeline(
      deviceEvents,
      event,
      device?.mission,
      device?.mode
    )
  }, [deviceEvents, event, device?.mission, device?.mode])

  const durationLabel = useMemo(() => {
    if (!event) return "-"
    void durationTick
    return formatEventDurationLabel(
      event.eventType,
      event.ts,
      ack.resolved ? ack.resolvedAt : undefined
    )
  }, [event, ack.resolved, ack.resolvedAt, durationTick])

  if (!open || !event) return null

  const sevColor = severityColor(event.severity, {
    error: statusError,
    warning: statusWarning,
    secondary: textSecondary,
  })
  const onlineLabel = isDeviceOffline ? "OFFLINE" : "ONLINE"
  const onlineColor = isDeviceOffline ? statusOffline : statusOnline
  const currentMission = (device?.mission || device?.mode || "UNKNOWN").toUpperCase()
  const lastSeen = formatKoreanRelativeTime(
    device?.updatedAt ?? device?.lastSeenAt
  ).replace(" 전", "전")

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: withAlpha(background, 0.78),
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ko ? "장애 이벤트 상세" : "Event detail"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: "min(1120px, 100%)",
          maxHeight: "100%",
          overflow: "hidden",
          borderRadius: 18,
          background: panelBackground,
          border: `1px solid ${withAlpha(sevColor, 0.45)}`,
          boxShadow: `0 24px 80px ${withAlpha("#000", 0.6)}, 0 0 0 1px ${withAlpha(sevColor, 0.12)}`,
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: `linear-gradient(180deg, ${withAlpha(sevColor, 0.14)} 0%, transparent 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: sevColor,
                boxShadow: `0 0 12px ${withAlpha(sevColor, 0.8)}`,
                flexShrink: 0,
                animation: ack.resolved ? "none" : "rm-pulse 1.8s ease-in-out infinite",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  ...headingFont,
                  fontSize: coerceFontSize(headingFont?.fontSize, 20),
                  color: textPrimary,
                }}
              >
                {ko ? "장애 이벤트 상세" : "Event Detail"}
              </div>
              <div
                style={{
                  ...monoFont,
                  fontSize: coerceFontSize(monoFont?.fontSize, 12),
                  color: textSecondary,
                  marginTop: 4,
                }}
              >
                {event.deviceId} · {event.eventType}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onViewDevice}
              style={secondaryBtnStyle(borderColor, cardBackground, textPrimary, monoFont)}
            >
              {ko ? "장비 상세" : "Device"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={secondaryBtnStyle(borderColor, cardBackground, textPrimary, monoFont)}
            >
              {ko ? "닫기" : "Close"}
            </button>
          </div>
        </header>

        <div style={{ overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          <section
            style={{
              borderRadius: 14,
              border: `1px solid ${withAlpha(sevColor, 0.35)}`,
              background: withAlpha(cardBackground, 0.85),
              padding: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 14,
              }}
            >
              <StatusCell label={ko ? "장비 ID" : "Device ID"} value={event.deviceId} monoFont={monoFont} textPrimary={textPrimary} textSecondary={textSecondary} />
              <StatusCell label={ko ? "이벤트 유형" : "Event Type"} value={event.eventType} monoFont={monoFont} textPrimary={textPrimary} textSecondary={textSecondary} highlight={sevColor} />
              <StatusCell label="Severity" value={event.severity} monoFont={monoFont} textPrimary={textPrimary} textSecondary={textSecondary} highlight={sevColor} />
              <StatusCell label={ko ? "발생 시간" : "Created"} value={formatKoreanDateTime(event.ts)} monoFont={monoFont} textPrimary={textPrimary} textSecondary={textSecondary} />
              <StatusCell label={ko ? "현재 Mission/State" : "Current State"} value={currentMission} monoFont={monoFont} textPrimary={textPrimary} textSecondary={textSecondary} />
              <StatusCell
                label={ko ? "연결 상태" : "Connectivity"}
                value={onlineLabel}
                monoFont={monoFont}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                highlight={onlineColor}
              />
            </div>
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: withAlpha(sevColor, 0.1),
                border: `1px solid ${withAlpha(sevColor, 0.25)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ ...bodyFont, fontSize: 14, color: textSecondary }}>
                {ko ? "이벤트 지속" : "Duration"}
              </span>
              <span
                style={{
                  ...monoFont,
                  fontSize: coerceFontSize(monoFont?.fontSize, 15),
                  color: ack.resolved ? statusOnline : sevColor,
                  fontWeight: 600,
                }}
              >
                {ack.resolved
                  ? ko
                    ? `해결됨 · ${durationLabel}`
                    : `Resolved · ${durationLabel}`
                  : durationLabel}
              </span>
            </div>
          </section>

          <div
            className="rm-event-detail-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <Panel title={ko ? "이벤트 상세" : "Event payload"} borderColor={borderColor} cardBackground={cardBackground} headingFont={headingFont} textPrimary={textPrimary}>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    ...bodyFont,
                    fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                    lineHeight: 1.55,
                    color: textPrimary,
                  }}
                >
                  {payloadMessage}
                </pre>
                {backendEvent?.payload ? (
                  <details style={{ marginTop: 12 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        ...monoFont,
                        fontSize: 12,
                        color: textSecondary,
                      }}
                    >
                      Raw payload
                    </summary>
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 8,
                        background: withAlpha(background, 0.5),
                        overflow: "auto",
                        ...monoFont,
                        fontSize: 11,
                        color: textSecondary,
                      }}
                    >
                      {JSON.stringify(backendEvent.payload, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </Panel>

              <Panel title={ko ? "최근 상태 흐름" : "State timeline"} borderColor={borderColor} cardBackground={cardBackground} headingFont={headingFont} textPrimary={textPrimary}>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {timeline.map((entry, idx) => (
                    <div key={entry.id} style={{ display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: entry.isSelected
                              ? sevColor
                              : entry.isError
                                ? statusError
                                : withAlpha(accent, 0.7),
                            boxShadow: entry.isSelected
                              ? `0 0 10px ${withAlpha(sevColor, 0.7)}`
                              : "none",
                          }}
                        />
                        {idx < timeline.length - 1 ? (
                          <div
                            style={{
                              width: 2,
                              flex: 1,
                              minHeight: 28,
                              background: withAlpha(borderColor, 0.9),
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ paddingBottom: idx < timeline.length - 1 ? 14 : 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              ...monoFont,
                              fontSize: 13,
                              color: entry.isSelected ? sevColor : textPrimary,
                              fontWeight: entry.isSelected ? 600 : 400,
                            }}
                          >
                            {entry.label}
                          </span>
                          {entry.isSelected ? (
                            <Badge label={ko ? "현재 이벤트" : "This event"} color={sevColor} font={monoFont} />
                          ) : null}
                        </div>
                        <div
                          style={{
                            ...monoFont,
                            fontSize: 11,
                            color: textSecondary,
                            marginTop: 4,
                          }}
                        >
                          {formatKoreanRelativeTime(entry.ts).replace(" 전", "전")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {timeline.length > 1 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: withAlpha(background, 0.45),
                      ...monoFont,
                      fontSize: 11,
                      color: textSecondary,
                      overflowX: "auto",
                    }}
                  >
                    {timeline.map((e) => e.label).join(" → ")}
                  </div>
                ) : null}
              </Panel>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <Panel title={ko ? "실시간 장비 상태" : "Live telemetry"} borderColor={borderColor} cardBackground={cardBackground} headingFont={headingFont} textPrimary={textPrimary}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MetricCard
                    label={ko ? "배터리" : "Battery"}
                    value={`${formatBattery(device?.battery ?? 0)}%`}
                    hint=""
                    color={accent}
                    bg={withAlpha(cardBackground, 0.5)}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label={ko ? "온도" : "Temp"}
                    value={formatTemp(device?.temperature ?? 0)}
                    hint=""
                    color={statusWarning}
                    bg={withAlpha(cardBackground, 0.5)}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label={ko ? "속도" : "Speed"}
                    value={`${(device?.speedMps ?? 0).toFixed(2)} m/s`}
                    hint=""
                    color={textPrimary}
                    bg={withAlpha(cardBackground, 0.5)}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                  <MetricCard
                    label={ko ? "마지막 접속" : "Last seen"}
                    value={lastSeen}
                    hint=""
                    color={isDeviceOffline ? statusOffline : statusOnline}
                    bg={withAlpha(cardBackground, 0.5)}
                    border={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    labelFont={monoFont}
                    valueFont={headingFont}
                  />
                </div>
                <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                  <BatteryGauge
                    value={device?.battery ?? 0}
                    size={140}
                    stroke={12}
                    trackColor={withAlpha(borderColor, 0.65)}
                    valueColor={accent}
                    textColor={textPrimary}
                    font={headingFont}
                    bg={cardBackground}
                    border={borderColor}
                    tickColor={withAlpha(textSecondary, 0.5)}
                  />
                </div>
                <div
                  style={{
                    marginTop: 12,
                    ...monoFont,
                    fontSize: 12,
                    color: textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  {ko ? "위치" : "Position"}:{" "}
                  {device?.mapId ?? "N/A"} · x:{(device?.posX ?? 0).toFixed(2)} · y:
                  {(device?.posY ?? 0).toFixed(2)}
                </div>
              </Panel>

              <Panel title={ko ? "조치 상태 (ACK)" : "Acknowledgement"} borderColor={borderColor} cardBackground={cardBackground} headingFont={headingFont} textPrimary={textPrimary}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <AckRow
                    label={ko ? "ACK 여부" : "Acknowledged"}
                    value={
                      ack.acknowledged
                        ? ko
                          ? "확인 완료"
                          : "Yes"
                        : ko
                          ? "미확인"
                          : "No"
                    }
                    color={ack.acknowledged ? statusOnline : statusWarning}
                    monoFont={monoFont}
                    textSecondary={textSecondary}
                  />
                  <AckRow
                    label={ko ? "조치 담당자" : "Assignee"}
                    value={ack.assignee || "-"}
                    color={textPrimary}
                    monoFont={monoFont}
                    textSecondary={textSecondary}
                  />
                  <AckRow
                    label={ko ? "조치 시간" : "Ack time"}
                    value={ack.acknowledgedAt ? formatKoreanDateTime(ack.acknowledgedAt) : "-"}
                    color={textPrimary}
                    monoFont={monoFont}
                    textSecondary={textSecondary}
                  />
                  <AckRow
                    label={ko ? "해결 완료" : "Resolved"}
                    value={
                      ack.resolved
                        ? ko
                          ? `완료 (${formatKoreanDateTime(ack.resolvedAt)})`
                          : `Yes (${formatKoreanDateTime(ack.resolvedAt)})`
                        : ko
                          ? "진행 중"
                          : "Open"
                    }
                    color={ack.resolved ? statusOnline : statusError}
                    monoFont={monoFont}
                    textSecondary={textSecondary}
                  />

                  {!ack.resolved ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      <input
                        value={assigneeInput}
                        onChange={(e) => setAssigneeInput(e.target.value)}
                        placeholder={ko ? "담당자 이름 입력" : "Assignee name"}
                        style={{
                          border: `1px solid ${borderColor}`,
                          background: withAlpha(background, 0.4),
                          color: textPrimary,
                          borderRadius: 10,
                          padding: "10px 12px",
                          outline: "none",
                          ...bodyFont,
                          fontSize: 14,
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={!assigneeInput.trim()}
                          onClick={() => onAck(assigneeInput.trim())}
                          style={primaryBtnStyle(accent, textPrimary, monoFont, !assigneeInput.trim())}
                        >
                          {ack.acknowledged
                            ? ko
                              ? "담당자 변경"
                              : "Update assignee"
                            : ko
                              ? "ACK 확인"
                              : "Acknowledge"}
                        </button>
                        <button
                          type="button"
                          onClick={onResolve}
                          style={primaryBtnStyle(statusOnline, textPrimary, monoFont, false)}
                        >
                          {ko ? "해결 완료" : "Mark resolved"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes rm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.92); }
        }
        @media (max-width: 900px) {
          .rm-event-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Panel(props: {
  title: string
  borderColor: string
  cardBackground: string
  headingFont: RoboticsDashboardFont
  textPrimary: string
  children: ReactNode
}) {
  return (
    <section
      style={{
        borderRadius: 14,
        border: `1px solid ${props.borderColor}`,
        background: withAlpha(props.cardBackground, 0.7),
        padding: 14,
      }}
    >
      <h3
        style={{
          margin: "0 0 12px",
          ...props.headingFont,
          fontSize: coerceFontSize(props.headingFont?.fontSize, 15),
          color: props.textPrimary,
        }}
      >
        {props.title}
      </h3>
      {props.children}
    </section>
  )
}

function StatusCell(props: {
  label: string
  value: string
  monoFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  highlight?: string
}) {
  return (
    <div>
      <div
        style={{
          ...props.monoFont,
          fontSize: 11,
          color: props.textSecondary,
          marginBottom: 4,
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          ...props.monoFont,
          fontSize: 13,
          color: props.highlight ?? props.textPrimary,
          fontWeight: props.highlight ? 600 : 400,
          wordBreak: "break-all",
        }}
      >
        {props.value}
      </div>
    </div>
  )
}

function AckRow(props: {
  label: string
  value: string
  color: string
  monoFont: RoboticsDashboardFont
  textSecondary: string
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ ...props.monoFont, fontSize: 12, color: props.textSecondary }}>
        {props.label}
      </span>
      <span style={{ ...props.monoFont, fontSize: 12, color: props.color, textAlign: "right" }}>
        {props.value}
      </span>
    </div>
  )
}

function secondaryBtnStyle(
  borderColor: string,
  cardBackground: string,
  textPrimary: string,
  monoFont: RoboticsDashboardFont
) {
  return {
    border: `1px solid ${borderColor}`,
    background: cardBackground,
    color: textPrimary,
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    ...monoFont,
    fontSize: coerceFontSize(monoFont?.fontSize, 12),
  } as const
}

function primaryBtnStyle(
  accent: string,
  textPrimary: string,
  monoFont: RoboticsDashboardFont,
  disabled: boolean
) {
  return {
    border: `1px solid ${withAlpha(accent, 0.45)}`,
    background: withAlpha(accent, disabled ? 0.08 : 0.22),
    color: textPrimary,
    borderRadius: 10,
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    ...monoFont,
    fontSize: coerceFontSize(monoFont?.fontSize, 12),
  } as const
}
