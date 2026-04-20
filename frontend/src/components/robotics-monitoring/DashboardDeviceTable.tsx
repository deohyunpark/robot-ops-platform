import { useCallback } from "react"
import type { Device, DeviceStatus } from "./roboticsMonitoringDashboardTypes"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { Badge } from "./DashboardParts"
import {
  coerceFontSize,
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
  statusColor: (s: DeviceStatus) => string
  statusError: string
  statusWarning: string
  lowBatteryThreshold: number
  abnormalTempThreshold: number
  onSelect: (id: string) => void
  selectedId: string
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
    onSelect,
    panelBackground,
    selectedId,
    statusColor,
    statusError,
    statusWarning,
    textPrimary,
    textSecondary,
    ui,
  } = args

  return useCallback(
    (rows: Device[]) => {
      return (
        <div
          role="table"
          aria-label="Device list"
          style={{
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${borderColor}`,
            background: cardBackground,
          }}
        >
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1.3fr 0.9fr 0.7fr 0.6fr 0.6fr 0.9fr",
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
            }}
          >
            <span role="columnheader">{ui.device}</span>
            <span role="columnheader">{ui.status}</span>
            <span role="columnheader" style={{ textAlign: "right" }}>
              {ui.battery}
            </span>
            <span role="columnheader" style={{ textAlign: "right" }}>
              {ui.temp}
            </span>
            <span role="columnheader" style={{ textAlign: "right" }}>
              {ui.errors}
            </span>
            <span role="columnheader" style={{ textAlign: "right" }}>
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
                const c = statusColor(d.status)
                const batteryBad = d.battery <= lowBatteryThreshold
                const tempBad = d.temperature >= abnormalTempThreshold
                const errBad = d.errorRate >= 2.5
                const emergencyBad = d.emergency

                const rowBg = isSelected
                  ? withAlpha(accent, 0.1)
                  : "transparent"
                const rowHover = withAlpha(accent, 0.06)

                return (
                  <button
                    key={d.id}
                    type="button"
                    role="row"
                    aria-selected={isSelected}
                    onClick={() => onSelect(d.id)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns:
                        "1.3fr 0.9fr 0.7fr 0.6fr 0.6fr 0.9fr",
                      gap: 12,
                      padding: "12px 14px",
                      border: "none",
                      borderBottom: `1px solid ${borderColor}`,
                      background: rowBg,
                      color: textPrimary,
                      textAlign: "left",
                      cursor: "pointer",
                      outline: "none",
                      position: "relative",
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
                        }}
                      >
                        {d.name}
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
                        }}
                      >
                        {d.id} • {d.model}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
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
                        {d.status}
                      </span>
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
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
                        {Math.round(d.battery)}%
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
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
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
                      {tempBad ? (
                        <Badge
                          label="Hot"
                          color={statusError}
                          font={monoFont}
                        />
                      ) : null}
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...monoFont,
                          fontSize: coerceFontSize(monoFont?.fontSize, 12),
                          color: errBad ? statusError : textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.errorRate.toFixed(1)}%
                      </span>
                      {emergencyBad ? (
                        <Badge
                          label="EMERGENCY"
                          color={statusError}
                          font={monoFont}
                        />
                      ) : errBad ? (
                        <Badge
                          label="Spike"
                          color={statusError}
                          font={monoFont}
                        />
                      ) : null}
                    </span>

                    <span
                      role="cell"
                      style={{
                        textAlign: "right",
                        ...monoFont,
                        fontSize: coerceFontSize(monoFont?.fontSize, 12),
                        color: textSecondary,
                        whiteSpace: "nowrap",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      {d.status === "Offline"
                        ? `${Math.round(d.lastSeenMinutes)}m`
                        : ui.now}
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
                      button[role="row"]:hover .__hover { opacity: ${isSelected ? 0 : 1}; }
                      button[role="row"]:focus-visible { box-shadow: 0 0 0 3px ${withAlpha(accent, 0.35)} inset; }
                    `}</style>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )
    },
    [
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
      ui,
    ]
  )
}
