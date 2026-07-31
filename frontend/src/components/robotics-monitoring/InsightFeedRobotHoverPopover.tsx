import { useMemo } from "react"
import { Badge, BatteryGauge } from "./DashboardParts"
import type { Device, DeviceStatus } from "./roboticsMonitoringDashboardTypes"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import {
  coerceFontSize,
  formatBattery,
  formatKoreanRelativeTime,
  formatTemp,
  withAlpha,
} from "./roboticsMonitoringUtils"

export type InsightFeedHoverAnchor = {
  robotId: string
  clientX: number
  clientY: number
}

const POPOVER_WIDTH = 340
const CURSOR_GAP = 14
const VIEWPORT_PAD = 10

type InsightFeedRobotHoverPopoverProps = {
  device: Device
  anchor: InsightFeedHoverAnchor
  panelBackground: string
  cardBackground: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  accent: string
  statusOnline: string
  statusOffline: string
  statusWarning: string
  statusError: string
  statusMaintenance: string
  lowBatteryThreshold: number
  abnormalTempThreshold: number
  headingFont: RoboticsDashboardFont
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  robotIdLabel: string
  locationLabel: string
  batteryLabel: string
  sensorLabel: string
}

function statusColorFor(
  status: DeviceStatus,
  colors: {
    online: string
    offline: string
    warning: string
    error: string
    maintenance: string
    fallback: string
  }
) {
  switch (status) {
    case "Online":
      return colors.online
    case "Offline":
      return colors.offline
    case "Warning":
      return colors.warning
    case "Error":
      return colors.error
    case "Maintenance":
      return colors.maintenance
    default:
      return colors.fallback
  }
}

function computePopoverStyle(anchor: InsightFeedHoverAnchor) {
  const maxHeight = Math.min(480, window.innerHeight - VIEWPORT_PAD * 2)
  let left = anchor.clientX - POPOVER_WIDTH - CURSOR_GAP
  let top = anchor.clientY - 28

  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
  top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - maxHeight - VIEWPORT_PAD))

  return {
    left,
    top,
    width: POPOVER_WIDTH,
    maxHeight,
  }
}

export function InsightFeedRobotHoverPopover(props: InsightFeedRobotHoverPopoverProps) {
  const {
    device,
    anchor,
    panelBackground,
    cardBackground,
    borderColor,
    textPrimary,
    textSecondary,
    accent,
    statusOnline,
    statusOffline,
    statusWarning,
    statusError,
    statusMaintenance,
    lowBatteryThreshold,
    abnormalTempThreshold,
    headingFont,
    bodyFont,
    monoFont,
    robotIdLabel,
    locationLabel,
    batteryLabel,
    sensorLabel,
  } = props

  const layout = useMemo(() => computePopoverStyle(anchor), [anchor])

  const statusColor = statusColorFor(device.status, {
    online: statusOnline,
    offline: statusOffline,
    warning: statusWarning,
    error: statusError,
    maintenance: statusMaintenance,
    fallback: textSecondary,
  })

  const location = useMemo(() => {
    const hasPos =
      typeof device.posX === "number" &&
      typeof device.posY === "number" &&
      typeof device.theta === "number"
    const mapId = device.mapId ?? device.site ?? "N/A"
    if (hasPos) {
      return `${mapId} • x:${device.posX!.toFixed(1)} • y:${device.posY!.toFixed(1)}`
    }
    return `${mapId} • x:- • y:-`
  }, [device])

  const sensors = useMemo(() => {
    const speed = device.speedMps ?? 0
    const cpu = device.cpuPct ?? 0
    const mem = device.memPct ?? 0
    const lastSeen = formatKoreanRelativeTime(
      device.updatedAt ?? device.lastSeenAt
    ).replace(" 전", "전")

    return [
      {
        label: "Speed",
        state:
          device.status === "Offline" ? statusError : speed <= 0.01 ? statusWarning : statusOnline,
        detail: `${speed.toFixed(2)} m/s`,
      },
      {
        label: "CPU",
        state: cpu >= 90 ? statusError : cpu >= 75 ? statusWarning : statusOnline,
        detail: `${cpu.toFixed(1)}%`,
      },
      {
        label: "Memory",
        state: mem >= 90 ? statusError : mem >= 75 ? statusWarning : statusOnline,
        detail: `${mem.toFixed(1)}%`,
      },
      {
        label: "Last seen",
        state: device.status === "Offline" ? statusError : statusOnline,
        detail: lastSeen,
      },
    ]
  }, [
    device,
    statusError,
    statusOnline,
    statusWarning,
  ])

  return (
    <div
      role="tooltip"
      aria-live="polite"
      style={{
        position: "fixed",
        left: layout.left,
        top: layout.top,
        width: layout.width,
        maxHeight: layout.maxHeight,
        zIndex: 80,
        pointerEvents: "none",
        borderRadius: 14,
        background: panelBackground,
        border: `1px solid ${withAlpha(borderColor, 0.95)}`,
        boxShadow: `0 16px 40px ${withAlpha("#000", 0.35)}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              ...headingFont,
              fontSize: coerceFontSize(headingFont?.fontSize, 16),
              color: textPrimary,
              lineHeight: 1.2,
            }}
          >
            {device.name}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              borderRadius: 999,
              background: withAlpha(statusColor, 0.12),
              color: statusColor,
              border: `1px solid ${withAlpha(statusColor, 0.25)}`,
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 11),
            }}
          >
            {device.status}
          </span>
          <Badge
            label={device.emergency ? "Emergency" : "Normal"}
            color={device.emergency ? statusError : textSecondary}
            font={monoFont}
            subtle={!device.emergency}
          />
        </div>
        <div
          style={{
            ...monoFont,
            fontSize: coerceFontSize(monoFont?.fontSize, 11),
            color: textSecondary,
          }}
        >
          {robotIdLabel}: {device.id}
        </div>
        <div
          style={{
            ...bodyFont,
            fontSize: coerceFontSize(bodyFont?.fontSize, 12),
            color: textSecondary,
            lineHeight: 1.35,
          }}
        >
          {locationLabel}: {location}
        </div>
      </div>

      <div
        style={{
          padding: 12,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            background: cardBackground,
            border: `1px solid ${borderColor}`,
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BatteryGauge
            value={device.battery}
            size={92}
            stroke={10}
            trackColor={withAlpha(borderColor, 0.65)}
            valueColor={
              device.battery <= lowBatteryThreshold ? statusWarning : accent
            }
            textColor={textPrimary}
            font={headingFont}
            bg={cardBackground}
            border={borderColor}
            tickColor={withAlpha(textSecondary, 0.5)}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                ...headingFont,
                fontSize: coerceFontSize(headingFont?.fontSize, 13),
                color: textPrimary,
              }}
            >
              {batteryLabel}
            </div>
            <div
              style={{
                marginTop: 4,
                ...monoFont,
                fontSize: coerceFontSize(monoFont?.fontSize, 12),
                color: textSecondary,
              }}
            >
              {formatBattery(device.battery)}%
            </div>
            <div
              style={{
                marginTop: 6,
                ...monoFont,
                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                color:
                  device.temperature >= abnormalTempThreshold
                    ? statusError
                    : textSecondary,
              }}
            >
              {formatTemp(device.temperature)} / Ref {Math.round(abnormalTempThreshold)}°C
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              ...headingFont,
              fontSize: coerceFontSize(headingFont?.fontSize, 13),
              color: textPrimary,
              marginBottom: 8,
            }}
          >
            {sensorLabel}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {sensors.map((sensor) => (
              <div
                key={sensor.label}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${withAlpha(sensor.state, 0.22)}`,
                  background: withAlpha(sensor.state, 0.08),
                  padding: "8px 10px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      ...monoFont,
                      fontSize: coerceFontSize(monoFont?.fontSize, 11),
                      color: textPrimary,
                    }}
                  >
                    {sensor.label}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: sensor.state,
                      flexShrink: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 4,
                    ...bodyFont,
                    fontSize: coerceFontSize(bodyFont?.fontSize, 11),
                    color: textSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sensor.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
