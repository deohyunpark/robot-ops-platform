import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import {
  clamp,
  coerceFontSize,
  withAlpha,
} from "./roboticsMonitoringUtils"

export function KPI(props: {
  title: string
  value: string
  hint: string
  color: string
  bg: string
  border: string
  textPrimary: string
  textSecondary: string
  titleFont: RoboticsDashboardFont
  valueFont: RoboticsDashboardFont
  onClick?: () => void
}) {
  const {
    title,
    value,
    hint,
    color,
    bg,
    border,
    textPrimary,
    textSecondary,
    titleFont,
    valueFont,
    onClick,
  } = props
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 14,
        background: bg,
        border: `1px solid ${border}`,
        padding: 14,
        boxSizing: "border-box",
        overflow: "hidden",
        minHeight: 86,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderTop: `2px solid ${withAlpha(color, 0.55)}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            ...titleFont,
            fontSize: coerceFontSize(titleFont?.fontSize, 12),
            lineHeight: titleFont?.lineHeight ?? "1.2em",
            letterSpacing: titleFont?.letterSpacing ?? "-0.01em",
            color: textSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            userSelect: "none",
          }}
        >
          {title}
        </div>
        <div
          style={{
            ...valueFont,
            fontSize: coerceFontSize(valueFont?.fontSize, 20),
            lineHeight: valueFont?.lineHeight ?? "1.05em",
            letterSpacing: valueFont?.letterSpacing ?? "-0.03em",
            color: textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        {hint.trim() ? (
          <div
            style={{
              ...titleFont,
              fontSize: coerceFontSize(titleFont?.fontSize, 12),
              lineHeight: titleFont?.lineHeight ?? "1.2em",
              letterSpacing: titleFont?.letterSpacing ?? "-0.01em",
              color: textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MetricCard(props: {
  label: string
  value: string
  hint: string
  color: string
  bg: string
  border: string
  textPrimary: string
  textSecondary: string
  labelFont: RoboticsDashboardFont
  valueFont: RoboticsDashboardFont
}) {
  const {
    label,
    value,
    hint,
    color,
    bg,
    border,
    textPrimary,
    textSecondary,
    labelFont,
    valueFont,
  } = props
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        background: bg,
        border: `1px solid ${border}`,
        padding: 12,
        overflow: "hidden",
        boxSizing: "border-box",
        minHeight: 82,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: withAlpha(color, 0.75),
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            ...labelFont,
            fontSize: coerceFontSize(labelFont?.fontSize, 12),
            lineHeight: labelFont?.lineHeight ?? "1.2em",
            letterSpacing: labelFont?.letterSpacing ?? "-0.01em",
            color: textSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            userSelect: "none",
          }}
        >
          {label}
        </div>
        <div
          style={{
            ...valueFont,
            fontSize: coerceFontSize(valueFont?.fontSize, 18),
            lineHeight: valueFont?.lineHeight ?? "1.05em",
            letterSpacing: valueFont?.letterSpacing ?? "-0.03em",
            color: textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        <div
          style={{
            ...labelFont,
            fontSize: coerceFontSize(labelFont?.fontSize, 12),
            lineHeight: labelFont?.lineHeight ?? "1.2em",
            letterSpacing: labelFont?.letterSpacing ?? "-0.01em",
            color: textSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {hint}
        </div>
      </div>
    </div>
  )
}

export function Badge(props: {
  label: string
  color: string
  font: RoboticsDashboardFont
  subtle?: boolean
}) {
  const { label, color, font, subtle } = props
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${withAlpha(color, subtle ? 0.18 : 0.28)}`,
        background: withAlpha(color, subtle ? 0.08 : 0.12),
        color,
        ...font,
        fontSize: coerceFontSize(font?.fontSize, 12),
        lineHeight: font?.lineHeight ?? "1em",
        letterSpacing: font?.letterSpacing ?? "-0.01em",
        whiteSpace: "nowrap",
        maxWidth: 520,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </span>
  )
}

export function FilterChip(props: {
  label: string
  active: boolean
  color: string
  font: RoboticsDashboardFont
}) {
  const { label, active, color, font } = props
  return (
    <span
      aria-label={`${label} filter ${active ? "active" : "inactive"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: `1px solid ${withAlpha(color, active ? 0.32 : 0.14)}`,
        background: withAlpha(color, active ? 0.14 : 0.06),
        color: active ? color : withAlpha(color, 0.9),
        ...font,
        fontSize: coerceFontSize(font?.fontSize, 12),
        lineHeight: font?.lineHeight ?? "1em",
        letterSpacing: font?.letterSpacing ?? "-0.01em",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: active ? color : withAlpha(color, 0.4),
          boxShadow: active
            ? `0 0 0 3px ${withAlpha(color, 0.12)}`
            : "none",
        }}
      />
      {label}
    </span>
  )
}

export function BatteryGauge(props: {
  value: number
  size: number
  stroke: number
  trackColor: string
  valueColor: string
  textColor: string
  font: RoboticsDashboardFont
  bg?: string
  border?: string
  tickColor?: string
}) {
  const {
    value,
    size,
    stroke,
    trackColor,
    valueColor,
    textColor,
    font,
    bg,
    border,
    tickColor,
  } = props
  const v = clamp(value, 0, 100)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (v / 100) * c
  const ticks = 24

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Battery gauge"
    >
      {bg ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - stroke * 0.65}
          fill={bg}
          stroke={border ?? "transparent"}
          strokeWidth={1}
        />
      ) : null}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={valueColor}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {Array.from({ length: ticks }).map((_, i) => {
        const a = (i / ticks) * Math.PI * 2 - Math.PI / 2
        const inner = r - stroke - 2
        const outer = inner + (i % 6 === 0 ? 8 : 5)
        const x1 = size / 2 + Math.cos(a) * inner
        const y1 = size / 2 + Math.sin(a) * inner
        const x2 = size / 2 + Math.cos(a) * outer
        const y2 = size / 2 + Math.sin(a) * outer
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={tickColor ?? withAlpha("#FFFFFF", 0.22)}
            strokeWidth={i % 6 === 0 ? 1.4 : 1}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={textColor}
        style={{
          ...font,
          fontSize: coerceFontSize(font?.fontSize, 16),
        }}
      >
        {Math.round(v)}%
      </text>
      <text
        x="50%"
        y={size / 2 + 22}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={withAlpha(textColor, 0.72)}
        style={{
          fontSize: 11,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          letterSpacing: "-0.01em",
        }}
      >
        {v <= 20 ? "LOW" : v >= 90 ? "HIGH" : "OK"}
      </text>
    </svg>
  )
}

export function Sparkline(props: {
  values: number[]
  stroke: string
  fill: string
  grid: string
  referenceValue?: number
  referenceColor?: string
}) {
  const { values, stroke, fill, grid, referenceValue, referenceColor } = props
  const w = 600
  const h = 120
  const pad = 8
  const n = values.length
  const min = n ? Math.min(...values) : 0
  const max = n ? Math.max(...values) : 100
  const span = Math.max(1e-6, max - min)

  const points = values
    .map((v, i) => {
      const x = pad + (i / Math.max(1, n - 1)) * (w - pad * 2)
      const y = pad + (1 - (v - min) / span) * (h - pad * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  const area = points
    ? `M ${points} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`
    : ""
  const refY =
    typeof referenceValue === "number"
      ? clamp(pad + (1 - (referenceValue - min) / span) * (h - pad * 2), pad, h - pad)
      : null

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Battery chart"
    >
      <path
        d={`M ${pad},${h - pad} H ${w - pad}`}
        stroke={grid}
        strokeWidth={1}
        fill="none"
      />
      <path
        d={`M ${pad},${pad} H ${w - pad}`}
        stroke={withAlpha(grid, 0.55)}
        strokeWidth={1}
        fill="none"
      />
      {refY !== null ? (
        <path
          d={`M ${pad},${refY} H ${w - pad}`}
          stroke={referenceColor ?? withAlpha(stroke, 0.7)}
          strokeWidth={1.25}
          strokeDasharray="5 4"
          fill="none"
        />
      ) : null}
      {area ? <path d={area} fill={fill} stroke="none" /> : null}
      {points ? (
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  )
}
