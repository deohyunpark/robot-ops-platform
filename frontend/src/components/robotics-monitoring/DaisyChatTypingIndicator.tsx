import { withAlpha } from "./roboticsMonitoringUtils"

type DaisyChatTypingIndicatorProps = {
  borderColor: string
  cardBackground: string
  accent: string
}

export function DaisyChatTypingIndicator(props: DaisyChatTypingIndicatorProps) {
  const { borderColor, cardBackground, accent } = props

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
      style={{ display: "flex", justifyContent: "flex-start" }}
    >
      <div
        style={{
          borderRadius: 14,
          padding: "12px 16px",
          background: cardBackground,
          border: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            minWidth: 36,
            height: 18,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${withAlpha(accent, 0.35)}`,
                animation: `daisyChatTypingBounce 1s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </span>
      </div>
      <style>{`
        @keyframes daisyChatTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
