import type { CSSProperties } from "react"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { coerceFontSize, withAlpha } from "./roboticsMonitoringUtils"

type DaisyChatInsertHintProps = {
  text: string
  fleetPointer?: string
  bodyFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  accent: string
  cardBackground: string
}

export function DaisyChatInsertHint(props: DaisyChatInsertHintProps) {
  const {
    text,
    fleetPointer,
    bodyFont,
    textPrimary,
    textSecondary,
    accent,
    cardBackground,
  } = props

  const bubble: CSSProperties = {
    position: "relative",
    alignSelf: "flex-start",
    maxWidth: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${withAlpha(accent, 0.35)}`,
    background: withAlpha(cardBackground, 0.96),
    boxShadow: `0 8px 24px ${withAlpha(accent, 0.12)}`,
    ...bodyFont,
    fontSize: coerceFontSize(bodyFont?.fontSize, 12),
    lineHeight: 1.5,
    color: textPrimary,
  }

  const tail: CSSProperties = {
    position: "absolute",
    left: 18,
    bottom: -6,
    width: 12,
    height: 12,
    transform: "rotate(45deg)",
    background: withAlpha(cardBackground, 0.96),
    borderRight: `1px solid ${withAlpha(accent, 0.35)}`,
    borderBottom: `1px solid ${withAlpha(accent, 0.35)}`,
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        animation: "daisyHintIn 0.22s ease",
      }}
    >
      <div style={bubble}>
        <span style={{ color: accent, fontWeight: 700, marginRight: 6 }}>Tip</span>
        {text}
        <span aria-hidden="true" style={tail} />
      </div>
      {fleetPointer ? (
        <span
          style={{
            ...bodyFont,
            fontSize: coerceFontSize(bodyFont?.fontSize, 11),
            color: textSecondary,
            paddingLeft: 4,
          }}
        >
          {fleetPointer}
        </span>
      ) : null}
      <style>{`
        @keyframes daisyHintIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
