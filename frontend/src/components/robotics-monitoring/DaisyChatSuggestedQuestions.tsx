import type { CSSProperties } from "react"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { coerceFontSize, withAlpha } from "./roboticsMonitoringUtils"

export type DaisySuggestedQuestion = {
  id: string
  label: string
  text: string
}

type DaisyChatSuggestedQuestionsProps = {
  title: string
  subtitle?: string
  questions: DaisySuggestedQuestion[]
  onSelect: (text: string) => void
  disabled?: boolean
  variant?: "empty" | "compact"
  bodyFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  accent: string
  borderColor: string
  cardBackground: string
}

function questionButtonStyle(args: {
  variant: "empty" | "compact"
  bodyFont: RoboticsDashboardFont
  textPrimary: string
  accent: string
  borderColor: string
  cardBackground: string
  disabled?: boolean
}): CSSProperties {
  const compact = args.variant === "compact"
  return {
    border: `1px solid ${withAlpha(args.accent, compact ? 0.28 : 0.35)}`,
    background: withAlpha(args.cardBackground, compact ? 0.92 : 0.88),
    color: args.textPrimary,
    borderRadius: compact ? 999 : 12,
    padding: compact ? "6px 12px" : "10px 12px",
    cursor: args.disabled ? "not-allowed" : "pointer",
    opacity: args.disabled ? 0.55 : 1,
    textAlign: "left",
    ...args.bodyFont,
    fontSize: coerceFontSize(args.bodyFont?.fontSize, compact ? 12 : 13),
    lineHeight: 1.45,
    transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
    boxShadow: compact ? "none" : `0 0 0 0 ${withAlpha(args.accent, 0)}`,
  }
}

export function DaisyChatSuggestedQuestions(props: DaisyChatSuggestedQuestionsProps) {
  const {
    title,
    subtitle,
    questions,
    onSelect,
    disabled,
    variant = "compact",
    bodyFont,
    textPrimary,
    textSecondary,
    accent,
    borderColor,
    cardBackground,
  } = props

  if (!questions.length) return null

  const compact = variant === "compact"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 12,
        alignItems: compact ? "stretch" : "center",
        justifyContent: compact ? "flex-start" : "center",
        padding: compact ? 0 : "12px 4px 4px",
      }}
    >
      <div style={{ width: "100%", maxWidth: compact ? undefined : 420 }}>
        <div
          style={{
            ...bodyFont,
            fontSize: coerceFontSize(bodyFont?.fontSize, compact ? 11 : 14),
            fontWeight: 700,
            color: compact ? textSecondary : textPrimary,
            marginBottom: compact ? 0 : 4,
          }}
        >
          {title}
        </div>
        {!compact && subtitle ? (
          <div
            style={{
              ...bodyFont,
              fontSize: coerceFontSize(bodyFont?.fontSize, 12),
              lineHeight: 1.5,
              color: textSecondary,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: compact ? 6 : 8,
          justifyContent: compact ? "flex-start" : "center",
          width: "100%",
          maxWidth: compact ? undefined : 520,
        }}
      >
        {questions.map((question) => (
          <button
            key={question.id}
            type="button"
            disabled={disabled}
            title={question.text}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onSelect(question.text)}
            style={questionButtonStyle({
              variant,
              bodyFont,
              textPrimary,
              accent,
              borderColor,
              cardBackground,
              disabled,
            })}
            onMouseEnter={(e) => {
              if (disabled) return
              e.currentTarget.style.borderColor = withAlpha(accent, 0.55)
              e.currentTarget.style.background = withAlpha(accent, compact ? 0.1 : 0.12)
              if (!compact) {
                e.currentTarget.style.boxShadow = `0 0 0 1px ${withAlpha(accent, 0.12)}`
              }
            }}
            onMouseLeave={(e) => {
              const base = questionButtonStyle({
                variant,
                bodyFont,
                textPrimary,
                accent,
                borderColor,
                cardBackground,
                disabled,
              })
              e.currentTarget.style.borderColor = String(base.border)
              e.currentTarget.style.background = String(base.background)
              e.currentTarget.style.boxShadow = compact
                ? "none"
                : `0 0 0 0 ${withAlpha(accent, 0)}`
            }}
          >
            {question.label}
          </button>
        ))}
      </div>
    </div>
  )
}
