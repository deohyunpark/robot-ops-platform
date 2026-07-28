import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { type InsightFeedItem } from "./telemetryAdapter"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { withAlpha } from "./roboticsMonitoringUtils"

type InsightFeedPanelProps = {
  items: InsightFeedItem[]
  language: "ko" | "en"
  cardBackground: string
  panelBackground: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  accent: string
  statusError: string
  statusWarning: string
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  onDismissRobot: (robotId: string) => void
}

function levelColor(
  level: string,
  colors: {
    error: string
    warning: string
    accent: string
    secondary: string
  }
) {
  const x = level.toUpperCase()
  if (x === "HIGH" || x === "CRITICAL") return colors.error
  if (x === "MIDDLE" || x === "WARNING" || x === "WARN") return colors.warning
  if (x === "LOW" || x === "INFO") return colors.accent
  return colors.secondary
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  )
}

function IconLightbulb() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18h6M10 22h4M12 2a6 6 0 0 0-3 11v1h6v-1a6 6 0 0 0-3-11Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AiSummaryCard(props: {
  item: InsightFeedItem
  language: "ko" | "en"
  cardBackground: string
  panelBackground: string
  borderColor: string
  textPrimary: string
  textSecondary: string
  accent: string
  statusError: string
  statusWarning: string
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  onDismissRobot: (robotId: string) => void
}) {
  const {
    item,
    language,
    cardBackground,
    panelBackground,
    borderColor,
    textPrimary,
    textSecondary,
    accent,
    statusError,
    statusWarning,
    bodyFont,
    monoFont,
    onDismissRobot,
  } = props

  const ko = language === "ko"
  const [expanded, setExpanded] = useState<"cause" | "action" | null>(null)
  const dotColor = levelColor(item.level, {
    error: statusError,
    warning: statusWarning,
    accent,
    secondary: textSecondary,
  })

  return (
    <div
      style={{
        width: "100%",
        background: cardBackground,
        borderRadius: 16,
        border: `1px solid ${withAlpha(dotColor, 0.35)}`,
        boxShadow: `0 10px 28px ${withAlpha("#000", 0.18)}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "16px 16px 12px",
          gap: 10,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: dotColor,
              marginTop: 6,
              flexShrink: 0,
              boxShadow: `0 0 10px ${withAlpha(dotColor, 0.65)}`,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: monoFont.fontFamily,
                fontSize: 18,
                fontWeight: 700,
                color: textPrimary,
                lineHeight: 1.3,
                wordBreak: "break-all",
              }}
            >
              {item.robotId}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: monoFont.fontFamily,
                fontSize: 15,
                fontWeight: 700,
                color: dotColor,
                lineHeight: 1.3,
              }}
            >
              {item.level}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismissRobot(item.robotId)}
          aria-label={ko ? "닫기" : "Close"}
          style={{
            border: `1px solid ${borderColor}`,
            background: withAlpha(panelBackground, 0.8),
            color: textSecondary,
            cursor: "pointer",
            borderRadius: 8,
            padding: 6,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconClose />
        </button>
      </div>

      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: bodyFont.fontFamily,
            fontSize: 17,
            color: textPrimary,
            lineHeight: 1.55,
          }}
        >
          {item.description}
        </p>

        {expanded === "cause" ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: withAlpha(panelBackground, 0.9),
              border: `1px solid ${borderColor}`,
              fontFamily: bodyFont.fontFamily,
              fontSize: 15,
              color: textPrimary,
              lineHeight: 1.5,
            }}
          >
            {item.possibleCause}
          </div>
        ) : null}

        {expanded === "action" ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: withAlpha(accent, 0.12),
              border: `1px solid ${withAlpha(accent, 0.28)}`,
              fontFamily: bodyFont.fontFamily,
              fontSize: 15,
              color: textPrimary,
              lineHeight: 1.5,
            }}
          >
            {item.recommendation}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              setExpanded((prev) => (prev === "cause" ? null : "cause"))
            }
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              border: `1px solid ${withAlpha(accent, 0.25)}`,
              borderRadius: 10,
              padding: "10px 12px",
              minHeight: 40,
              cursor: "pointer",
              background: withAlpha(accent, 0.14),
              color: textPrimary,
              fontFamily: monoFont.fontFamily,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <IconAlert />
            {ko ? "원인보기" : "Cause"}
          </button>
          <button
            type="button"
            onClick={() =>
              setExpanded((prev) => (prev === "action" ? null : "action"))
            }
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              border: "none",
              borderRadius: 10,
              padding: "10px 12px",
              minHeight: 40,
              cursor: "pointer",
              background: accent,
              color: "#0B141A",
              fontFamily: monoFont.fontFamily,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <IconLightbulb />
            {ko ? "추천조치" : "Action"}
          </button>
        </div>
      </div>
    </div>
  )
}

function InsightFeedScrollShell(props: {
  borderColor: string
  cardBackground: string
  children: ReactNode
}) {
  const shellStyle: CSSProperties = {
    borderRadius: 14,
    border: `1px solid ${props.borderColor}`,
    background: withAlpha(props.cardBackground, 0.45),
    padding: 10,
    boxSizing: "border-box",
  }

  return (
    <div className="rm-insight-feed-scroll" style={shellStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: "min-content",
        }}
      >
        {props.children}
      </div>
    </div>
  )
}

export function InsightFeedPanel(props: InsightFeedPanelProps) {
  const {
    items,
    language,
    cardBackground,
    borderColor,
    textPrimary,
    textSecondary,
    accent,
    statusError,
    statusWarning,
    bodyFont,
    monoFont,
    panelBackground,
    onDismissRobot,
  } = props

  const ko = language === "ko"
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    [items]
  )

  if (!sortedItems.length) {
    return (
      <InsightFeedScrollShell borderColor={borderColor} cardBackground={cardBackground}>
        <div
          style={{
            minHeight: 220,
            borderRadius: 12,
            background: cardBackground,
            border: `1px solid ${borderColor}`,
            padding: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: bodyFont.fontFamily,
              fontSize: 16,
              fontWeight: 500,
              color: textPrimary,
              lineHeight: 1.6,
              maxWidth: 300,
            }}
          >
            {ko
              ? "수신된 인사이트 피드가 없습니다. WebSocket /robot/device/feed 메시지를 기다리는 중입니다."
              : "No insight feed yet. Waiting for /robot/device/feed messages."}
          </p>
        </div>
      </InsightFeedScrollShell>
    )
  }

  return (
    <InsightFeedScrollShell borderColor={borderColor} cardBackground={cardBackground}>
      {sortedItems.map((item) => (
        <AiSummaryCard
          key={item.id}
          item={item}
          language={language}
          cardBackground={cardBackground}
          panelBackground={panelBackground}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          accent={accent}
          statusError={statusError}
          statusWarning={statusWarning}
          bodyFont={bodyFont}
          monoFont={monoFont}
          onDismissRobot={onDismissRobot}
        />
      ))}
    </InsightFeedScrollShell>
  )
}
