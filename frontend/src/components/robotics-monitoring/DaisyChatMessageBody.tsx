import type { CSSProperties } from "react"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import {
  parseDaisyInline,
  severityColor,
  shouldUseDaisyEventReportCards,
  tryParseDaisyEventReport,
  type DaisyContentBlock,
  type DaisyEventCard,
} from "../../services/daisyChatFormat"
import { DaisyChatMarkdown } from "./DaisyChatMarkdown"
import { coerceFontSize, withAlpha } from "./roboticsMonitoringUtils"

type DaisyChatMessageBodyProps = {
  text: string
  role: "user" | "assistant"
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  borderColor: string
  cardBackground: string
  statusError: string
  statusWarning: string
  accent: string
}

function inlineStyle(
  part: ReturnType<typeof parseDaisyInline>[number],
  base: CSSProperties
): CSSProperties {
  if (part.type === "bold") return { ...base, fontWeight: 700 }
  if (part.type === "code") {
    return {
      ...base,
      fontFamily: "monospace",
      fontSize: "0.92em",
      padding: "1px 5px",
      borderRadius: 6,
      background: withAlpha(base.color as string, 0.08),
    }
  }
  return base
}

function DaisyInlineText(props: {
  text: string
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  textPrimary: string
}) {
  const base: CSSProperties = {
    ...props.bodyFont,
    fontSize: coerceFontSize(props.bodyFont?.fontSize, 13),
    lineHeight: props.bodyFont?.lineHeight ?? "1.55em",
    letterSpacing: props.bodyFont?.letterSpacing ?? "-0.01em",
    color: props.textPrimary,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }

  return (
    <>
      {parseDaisyInline(props.text).map((part, idx) => (
        <span key={`${part.type}-${idx}`} style={inlineStyle(part, base)}>
          {part.value}
        </span>
      ))}
    </>
  )
}

function DaisyEventCardView(props: {
  card: DaisyEventCard
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  borderColor: string
  cardBackground: string
  statusError: string
  statusWarning: string
  accent: string
}) {
  const {
    card,
    bodyFont,
    monoFont,
    textPrimary,
    textSecondary,
    borderColor,
    cardBackground,
    statusError,
    statusWarning,
    accent,
  } = props

  const sevColor = severityColor(card.severity, {
    critical: statusError,
    warning: statusWarning,
    info: accent,
    fallback: textSecondary,
  })

  const rows = [
    { label: "이벤트 타입", value: card.eventType },
    { label: "심각도", value: card.severity, highlight: sevColor },
    { label: "발생 시각", value: card.occurredAt },
  ].filter((row) => row.value)

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${withAlpha(sevColor, 0.35)}`,
        background: withAlpha(cardBackground, 0.92),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px",
          borderBottom: `1px solid ${withAlpha(borderColor, 0.85)}`,
          background: withAlpha(sevColor, 0.08),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 11),
              color: textSecondary,
              flexShrink: 0,
            }}
          >
            #{card.index}
          </span>
          <span
            style={{
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 14),
              fontWeight: 700,
              color: textPrimary,
              wordBreak: "break-all",
            }}
          >
            {card.robotId}
          </span>
        </div>
        {card.severity ? (
          <span
            style={{
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 11),
              fontWeight: 700,
              color: sevColor,
              padding: "3px 8px",
              borderRadius: 999,
              border: `1px solid ${withAlpha(sevColor, 0.35)}`,
              background: withAlpha(sevColor, 0.12),
              whiteSpace: "nowrap",
            }}
          >
            {card.severity}
          </span>
        ) : null}
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr",
              gap: 8,
              alignItems: "start",
            }}
          >
            <span
              style={{
                ...monoFont,
                fontSize: coerceFontSize(monoFont?.fontSize, 11),
                color: textSecondary,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                ...bodyFont,
                fontSize: coerceFontSize(bodyFont?.fontSize, 12),
                color: row.highlight ?? textPrimary,
                fontWeight: row.highlight ? 700 : 400,
                wordBreak: "break-word",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}

        {card.details.length ? (
          <div
            style={{
              marginTop: 2,
              borderRadius: 10,
              border: `1px solid ${withAlpha(borderColor, 0.85)}`,
              background: withAlpha(cardBackground, 0.65),
              padding: "8px 10px",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "6px 10px",
            }}
          >
            {card.details.map((detail) => (
              <div key={`${card.robotId}-${detail.label}`} style={{ minWidth: 0 }}>
                <div
                  style={{
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 10),
                    color: textSecondary,
                    marginBottom: 2,
                  }}
                >
                  {detail.label}
                </div>
                <div
                  style={{
                    ...monoFont,
                    fontSize: coerceFontSize(monoFont?.fontSize, 11),
                    color: textPrimary,
                    wordBreak: "break-word",
                  }}
                >
                  {detail.value}
                </div>
              </div>
            ))}
          </div>
        ) : card.detailRaw ? (
          <pre
            style={{
              margin: 0,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${withAlpha(borderColor, 0.85)}`,
              background: withAlpha(cardBackground, 0.65),
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 11),
              color: textPrimary,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {card.detailRaw}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

function DaisyBlockView(props: {
  block: DaisyContentBlock
  bodyFont: RoboticsDashboardFont
  monoFont: RoboticsDashboardFont
  textPrimary: string
  textSecondary: string
  borderColor: string
  cardBackground: string
  statusError: string
  statusWarning: string
  accent: string
}) {
  const {
    block,
    bodyFont,
    monoFont,
    textPrimary,
    textSecondary,
    borderColor,
    cardBackground,
    statusError,
    statusWarning,
    accent,
  } = props

  if (block.type === "eventReport") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {block.intro ? (
          <DaisyChatMarkdown
            text={block.intro}
            bodyFont={bodyFont}
            monoFont={monoFont}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            cardBackground={cardBackground}
            statusError={statusError}
            statusWarning={statusWarning}
            accent={accent}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {block.cards.map((card) => (
            <DaisyEventCardView
              key={`${card.index}-${card.robotId}-${card.occurredAt}`}
              card={card}
              bodyFont={bodyFont}
              monoFont={monoFont}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderColor={borderColor}
              cardBackground={cardBackground}
              statusError={statusError}
              statusWarning={statusWarning}
              accent={accent}
            />
          ))}
        </div>
        {block.outro ? (
          <DaisyChatMarkdown
            text={block.outro}
            bodyFont={bodyFont}
            monoFont={monoFont}
            textPrimary={textSecondary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            cardBackground={cardBackground}
            statusError={statusError}
            statusWarning={statusWarning}
            accent={accent}
          />
        ) : null}
      </div>
    )
  }

  if (block.type === "heading") {
    const size = block.level <= 1 ? 15 : block.level === 2 ? 14 : 13
    return (
      <div
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, size),
          fontWeight: 700,
          lineHeight: 1.4,
          color: textPrimary,
          marginTop: block.level > 1 ? 2 : 0,
        }}
      >
        <DaisyInlineText
          text={block.text}
          bodyFont={bodyFont}
          monoFont={monoFont}
          textPrimary={textPrimary}
        />
      </div>
    )
  }

  if (block.type === "code") {
    return (
      <pre
        style={{
          margin: 0,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${borderColor}`,
          background: withAlpha(cardBackground, 0.85),
          overflowX: "auto",
          ...monoFont,
          fontSize: coerceFontSize(monoFont?.fontSize, 12),
          lineHeight: 1.45,
          color: textPrimary,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {block.text}
      </pre>
    )
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul"
    return (
      <ListTag
        style={{
          margin: 0,
          paddingLeft: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {block.items.map((item, idx) => (
          <li
            key={`${block.ordered ? "o" : "u"}-${idx}`}
            style={{
              ...bodyFont,
              fontSize: coerceFontSize(bodyFont?.fontSize, 13),
              lineHeight: bodyFont?.lineHeight ?? "1.55em",
              color: textPrimary,
              paddingLeft: 2,
            }}
          >
            <DaisyInlineText
              text={item}
              bodyFont={bodyFont}
              monoFont={monoFont}
              textPrimary={textPrimary}
            />
          </li>
        ))}
      </ListTag>
    )
  }

  return (
    <p
      style={{
        margin: 0,
        ...bodyFont,
        fontSize: coerceFontSize(bodyFont?.fontSize, 13),
        lineHeight: bodyFont?.lineHeight ?? "1.55em",
        letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
        color: textPrimary,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <DaisyInlineText
        text={block.text}
        bodyFont={bodyFont}
        monoFont={monoFont}
        textPrimary={textPrimary}
      />
    </p>
  )
}

export function DaisyChatMessageBody(props: DaisyChatMessageBodyProps) {
  const {
    text,
    role,
    bodyFont,
    monoFont,
    textPrimary,
    textSecondary,
    borderColor,
    cardBackground,
    statusError,
    statusWarning,
    accent,
  } = props

  if (role === "user") {
    return (
      <div
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
          lineHeight: bodyFont?.lineHeight ?? "1.45em",
          letterSpacing: bodyFont?.letterSpacing ?? "-0.01em",
          color: textPrimary,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text}
      </div>
    )
  }

  const useEventReportCards = shouldUseDaisyEventReportCards(text)
  const eventReport = useEventReportCards ? tryParseDaisyEventReport(text) : null
  if (eventReport && eventReport.type === "eventReport") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <DaisyBlockView
          block={eventReport}
          bodyFont={bodyFont}
          monoFont={monoFont}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
          cardBackground={cardBackground}
          statusError={statusError}
          statusWarning={statusWarning}
          accent={accent}
        />
      </div>
    )
  }

  return (
    <DaisyChatMarkdown
      text={text}
      bodyFont={bodyFont}
      monoFont={monoFont}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      borderColor={borderColor}
      cardBackground={cardBackground}
      statusError={statusError}
      statusWarning={statusWarning}
      accent={accent}
    />
  )
}
