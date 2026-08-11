import { useCallback, useEffect, useState } from "react"
import type { Device } from "./roboticsMonitoringDashboardTypes"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { useMediaQuery } from "./useMediaQuery"
import {
  coerceFontSize,
  eventSeverityColor,
  formatBattery,
  formatKoreanRelativeTime,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

type UiStrings = Record<string, string>

export function useDeviceTableRenderer(args: {
  borderColor: string
  bodyFont: RoboticsDashboardFont
  cardBackground: string
  monoFont: RoboticsDashboardFont
  panelBackground: string
  textPrimary: string
  textSecondary: string
  accent: string
  statusError: string
  statusWarning: string
  lowBatteryThreshold: number
  abnormalTempThreshold: number
  onSelect: (id: string) => void
  selectedId: string
  chatInsertActive?: boolean
  outageDeviceIds?: ReadonlySet<string>
  ui: UiStrings
}) {
  const {
    abnormalTempThreshold,
    accent,
    borderColor,
    bodyFont,
    cardBackground,
    lowBatteryThreshold,
    monoFont,
    chatInsertActive,
    onSelect,
    outageDeviceIds,
    panelBackground,
    selectedId,
    statusError,
    statusWarning,
    textPrimary,
    textSecondary,
    ui,
  } = args
  const isCompactLayout = useMediaQuery("(max-width: 767px)")
  const tableColumns = "repeat(6, minmax(0, 1fr))"
  const tableMinWidth = isCompactLayout ? 720 : undefined
  const [chatInsertHoverId, setChatInsertHoverId] = useState<string | null>(null)

  useEffect(() => {
    if (!chatInsertActive) setChatInsertHoverId(null)
  }, [chatInsertActive])

  return useCallback(
    (rows: Device[]) => {
      return (
        <div
          style={{
            width: "100%",
            overflowX: isCompactLayout ? "auto" : undefined,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            role="table"
            aria-label="Device list"
            style={{
              width: "100%",
              minWidth: tableMinWidth,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${chatInsertActive ? withAlpha(accent, 0.45) : borderColor}`,
              background: cardBackground,
              boxShadow: chatInsertActive
                ? `0 0 0 1px ${withAlpha(accent, 0.12)}, 0 0 20px ${withAlpha(accent, 0.08)}`
                : undefined,
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: tableColumns,
              gap: 12,
              padding: "12px 14px",
              background: panelBackground,
              borderBottom: `1px solid ${borderColor}`,
              color: textSecondary,
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 12),
              lineHeight: monoFont?.lineHeight ?? "1.2em",
              letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
              userSelect: "none",
              textAlign: "center",
            }}
          >
            <span role="columnheader">{ui.device}</span>
            <span role="columnheader">{ui.status}</span>
            <span role="columnheader">
              {ui.battery}
            </span>
            <span role="columnheader">
              {ui.temp}
            </span>
            <span role="columnheader">
              {ui.fleetColEvent ?? "Event"}
            </span>
            <span role="columnheader">
              {ui.lastSeen}
            </span>
          </div>

          <div role="rowgroup" style={{ maxHeight: 420, overflow: "auto" }}>
            {rows.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  color: textSecondary,
                  ...bodyFont,
                  fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                }}
              >
                {ui.noMatch}
              </div>
            ) : (
              rows.map((d) => {
                const isSelected = d.id === selectedId
                const statusText = d.mission?.trim() || "-"
                const missionColor = getMissionColor(statusText, accent)
                const eventText = d.lastEventType?.trim() || "-"
                const severity = (d.lastEventSeverity ?? "").toUpperCase()
                const eventColor = eventSeverityColor(d.lastEventSeverity, {
                  error: statusError,
                  warning: statusWarning,
                  info: accent,
                  secondary: textSecondary,
                })
                const isCriticalOutage = outageDeviceIds?.has(d.id) ?? false
                const isWarningEvent =
                  !isCriticalOutage &&
                  (severity === "WARN" || severity === "WARNING")
                const rowHighlightColor = isCriticalOutage
                  ? statusError
                  : isWarningEvent
                    ? statusWarning
                    : null
                const hasEventHighlight = rowHighlightColor !== null
                const batteryBad = d.battery <= lowBatteryThreshold
                const tempBad = d.temperature >= abnormalTempThreshold
                const eventBad = eventText !== "-"
                const isChatInsertHover =
                  chatInsertActive && chatInsertHoverId === d.id

                const rowBg = isChatInsertHover
                  ? withAlpha(accent, 0.24)
                  : hasEventHighlight
                    ? withAlpha(rowHighlightColor!, isSelected ? 0.24 : 0.14)
                    : isSelected
                      ? withAlpha(accent, 0.1)
                      : "transparent"
                const rowHover = hasEventHighlight
                  ? withAlpha(rowHighlightColor!, 0.1)
                  : withAlpha(accent, chatInsertActive ? 0.14 : 0.06)

                return (
                  <button
                    key={d.id}
                    type="button"
                    role="row"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      if (chatInsertActive) e.preventDefault()
                    }}
                    onMouseEnter={() => {
                      if (chatInsertActive) setChatInsertHoverId(d.id)
                    }}
                    onMouseLeave={() => {
                      if (chatInsertActive) {
                        setChatInsertHoverId((prev) => (prev === d.id ? null : prev))
                      }
                    }}
                    onClick={() => onSelect(d.id)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: tableColumns,
                      gap: 12,
                      padding: "12px 14px",
                      border: "none",
                      borderBottom: `1px solid ${hasEventHighlight ? withAlpha(rowHighlightColor!, 0.28) : borderColor}`,
                      borderLeft: hasEventHighlight
                        ? `3px solid ${rowHighlightColor!}`
                        : undefined,
                      background: rowBg,
                      color: textPrimary,
                      textAlign: "left",
                      cursor: chatInsertActive ? "copy" : "pointer",
                      outline: "none",
                      position: "relative",
                      boxShadow: isChatInsertHover
                        ? `inset 0 0 0 2px ${withAlpha(accent, 0.55)}, 0 4px 14px ${withAlpha(accent, 0.12)}`
                        : undefined,
                      transform: isChatInsertHover ? "translateX(3px)" : undefined,
                      transition:
                        "background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelect(d.id)
                      }
                    }}
                  >
                    <span
                      role="cell"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        minWidth: 0,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          ...bodyFont,
                          fontSize: coerceFontSize(bodyFont?.fontSize, 14),
                          lineHeight: bodyFont?.lineHeight ?? "1.2em",
                          letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "center",
                          fontWeight: isChatInsertHover || hasEventHighlight ? 700 : 400,
                          color: hasEventHighlight
                            ? rowHighlightColor!
                            : isChatInsertHover
                              ? accent
                              : textPrimary,
                        }}
                      >
                        {d.id}
                      </span>
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          lineHeight: monoFont?.lineHeight ?? "1.1em",
                          letterSpacing: monoFont?.letterSpacing ?? "-0.01em",
                          color: textSecondary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "center",
                        }}
                      >
                        {d.mode ?? d.name}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: withAlpha(missionColor, 0.12),
                          color: missionColor,
                          border: `1px solid ${withAlpha(missionColor, 0.25)}`,
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
                            background: missionColor,
                            boxShadow: `0 0 0 3px ${withAlpha(missionColor, 0.12)}`,
                          }}
                        />
                        {statusText}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: batteryBad ? statusWarning : textSecondary,
                        }}
                      >
                        {formatBattery(d.battery)}%
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 64,
                          height: 8,
                          borderRadius: 999,
                          background: withAlpha(panelBackground, 0.85),
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            width: `${Math.min(100, Math.max(0, d.battery))}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: batteryBad ? statusWarning : accent,
                          }}
                        />
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: tempBad ? statusError : textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTemp(d.temperature)}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: eventBad ? eventColor : textSecondary,
                          fontWeight:
                            severity === "CRITICAL" ||
                            severity === "ERROR" ||
                            severity === "WARN" ||
                            severity === "WARNING"
                              ? 700
                              : 400,
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {hasEventHighlight ? (
                          <span
                            aria-hidden="true"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: rowHighlightColor!,
                              boxShadow: `0 0 8px ${withAlpha(rowHighlightColor!, 0.75)}`,
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        {eventText}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "center",
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        color: textSecondary,
                        whiteSpace: "nowrap",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {formatKoreanRelativeTime(d.updatedAt ?? d.lastSeenAt)}
                    </span>

                    <span
                      aria-hidden="true"
                      style={{
                        pointerEvents: "none",
                        position: "absolute",
                        inset: 0,
                        background: rowHover,
                        opacity: 0,
                        transition: "opacity 0.15s ease",
                      }}
                      className="__hover"
                    />
                    <style>{`
                      button[role="row"]:hover .__hover { opacity: ${isSelected || chatInsertActive ? 0 : 1}; }
                      button[role="row"]:focus-visible { box-shadow: 0 0 0 3px ${withAlpha(accent, 0.35)} inset; }
                    `}</style>
                  </button>
                )
              })
            )}
          </div>
        </div>
        </div>
      )
    },
    [
      abnormalTempThreshold,
      isCompactLayout,
      tableMinWidth,
      accent,
      borderColor,
      bodyFont,
      cardBackground,
      chatInsertActive,
      chatInsertHoverId,
      lowBatteryThreshold,
      outageDeviceIds,
      monoFont,
      onSelect,
      panelBackground,
      selectedId,
      statusError,
      statusWarning,
      textPrimary,
      textSecondary,
      ui,
    ]
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
