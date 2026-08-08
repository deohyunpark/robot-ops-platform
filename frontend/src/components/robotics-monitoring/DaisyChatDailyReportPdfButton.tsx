import type { CSSProperties } from "react"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { coerceFontSize, withAlpha } from "./roboticsMonitoringUtils"

type DaisyChatDailyReportPdfButtonProps = {
  label: string
  loadingLabel: string
  hint?: string
  error?: string | null
  loading?: boolean
  disabled?: boolean
  onDownload: () => void
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  statusError: string
  accent: string
}

function PdfSpinner(props: { accent: string }) {
  const style: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: `2px solid ${withAlpha(props.accent, 0.22)}`,
    borderTopColor: props.accent,
    animation: "daisyPdfSpin 0.75s linear infinite",
    flexShrink: 0,
  }

  return <span aria-hidden="true" style={style} />
}

export function DaisyChatDailyReportPdfButton(
  props: DaisyChatDailyReportPdfButtonProps
) {
  const {
    label,
    loadingLabel,
    hint,
    error,
    loading,
    disabled,
    onDownload,
    bodyFont,
    monoFont,
    textPrimary,
    textSecondary,
    statusError,
    accent,
  } = props

  const isDisabled = Boolean(disabled || loading)

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={onDownload}
        aria-busy={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          alignSelf: "flex-start",
          border: `1px solid ${withAlpha(accent, 0.45)}`,
          background: withAlpha(accent, 0.14),
          color: textPrimary,
          borderRadius: 10,
          padding: "8px 12px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.65 : 1,
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 12),
          fontWeight: 600,
          lineHeight: 1.3,
          boxShadow: `0 0 0 1px ${withAlpha(accent, 0.08)}`,
        }}
      >
        {loading ? (
          <PdfSpinner accent={accent} />
        ) : (
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: 16,
              height: 16,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              background: withAlpha(accent, 0.18),
              color: accent,
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 10),
              fontWeight: 700,
            }}
          >
            PDF
          </span>
        )}
        {loading ? loadingLabel : label}
      </button>
      {error ? (
        <div
          role="alert"
          style={{
            ...bodyFont,
            fontSize: coerceFontSize(bodyFont?.fontSize, 11),
            lineHeight: 1.45,
            color: statusError,
          }}
        >
          {error}
        </div>
      ) : hint && !loading ? (
        <div
          style={{
            ...bodyFont,
            fontSize: coerceFontSize(bodyFont?.fontSize, 10),
            lineHeight: 1.45,
            color: textSecondary,
          }}
        >
          {hint}
        </div>
      ) : null}
      <style>{`
        @keyframes daisyPdfSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
