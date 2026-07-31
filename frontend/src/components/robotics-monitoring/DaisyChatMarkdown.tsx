import type { CSSProperties, ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { RoboticsDashboardFont } from "./roboticsMonitoringDashboardTypes"
import { prepareDaisyMarkdown } from "../../services/daisyChatFormat"
import { coerceFontSize, withAlpha } from "./roboticsMonitoringUtils"

type DaisyChatMarkdownProps = {
  text: string
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

function childText(children: ReactNode): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(childText).join("")
  if (children && typeof children === "object" && "props" in children) {
    const node = children as { props?: { children?: ReactNode } }
    return childText(node.props?.children ?? "")
  }
  return ""
}

export function DaisyChatMarkdown(props: DaisyChatMarkdownProps) {
  const {
    bodyFont,
    monoFont,
    textPrimary,
    textSecondary,
    borderColor,
    cardBackground,
    accent,
  } = props

  const source = prepareDaisyMarkdown(props.text)
  if (!source) return null

  const paragraphStyle: CSSProperties = {
    margin: 0,
    ...bodyFont,
    fontSize: coerceFontSize(bodyFont?.fontSize, 13),
    lineHeight: 1.55,
    color: textPrimary,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }

  const components: Components = {
    h1: ({ children }) => (
      <h1
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 16),
          fontWeight: 700,
          lineHeight: 1.35,
          color: textPrimary,
          margin: "4px 0 0",
          paddingBottom: 6,
          borderBottom: `1px solid ${withAlpha(borderColor, 0.75)}`,
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 15),
          fontWeight: 700,
          lineHeight: 1.35,
          color: textPrimary,
          margin: "4px 0 0",
          paddingBottom: 4,
          borderBottom: `1px solid ${withAlpha(borderColor, 0.75)}`,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 14),
          fontWeight: 700,
          lineHeight: 1.35,
          color: textPrimary,
          margin: "4px 0 0",
          paddingBottom: 4,
          borderBottom: `1px solid ${withAlpha(borderColor, 0.75)}`,
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        style={{
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
          fontWeight: 700,
          color: textPrimary,
          margin: "2px 0 0",
        }}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => <p style={paragraphStyle}>{children}</p>,
    ul: ({ children }) => (
      <ul
        style={{
          margin: 0,
          paddingLeft: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
          color: textPrimary,
        }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        style={{
          margin: 0,
          paddingLeft: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          ...bodyFont,
          fontSize: coerceFontSize(bodyFont?.fontSize, 13),
          color: textPrimary,
        }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => {
      const plain = childText(children)
      const isRobotLine = /\bRBT-/i.test(plain)

      return (
        <li
          style={{
            lineHeight: 1.55,
            paddingLeft: 2,
          }}
        >
          {isRobotLine ? (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${withAlpha(borderColor, 0.85)}`,
                background: withAlpha(cardBackground, 0.55),
                padding: "8px 10px",
              }}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </li>
      )
    },
    strong: ({ children }) => (
      <strong style={{ fontWeight: 700, color: textPrimary }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: "italic", color: textSecondary }}>{children}</em>
    ),
    code: ({ className, children }) => {
      const isBlock = Boolean(className)
      if (isBlock) {
        return (
          <code
            style={{
              display: "block",
              ...monoFont,
              fontSize: coerceFontSize(monoFont?.fontSize, 12),
              lineHeight: 1.45,
              color: textPrimary,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {children}
          </code>
        )
      }
      return (
        <code
          style={{
            ...monoFont,
            fontSize: coerceFontSize(monoFont?.fontSize, 12),
            padding: "1px 5px",
            borderRadius: 6,
            background: withAlpha(cardBackground, 0.85),
            border: `1px solid ${withAlpha(borderColor, 0.85)}`,
            color: textPrimary,
          }}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre
        style={{
          margin: 0,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${borderColor}`,
          background: withAlpha(cardBackground, 0.85),
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: 0,
          padding: "8px 12px",
          borderLeft: `3px solid ${withAlpha(accent, 0.55)}`,
          background: withAlpha(accent, 0.08),
          borderRadius: "0 8px 8px 0",
          color: textSecondary,
        }}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        style={{
          border: "none",
          borderTop: `1px solid ${withAlpha(borderColor, 0.85)}`,
          margin: "4px 0",
        }}
      />
    ),
    table: ({ children }) => (
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            ...monoFont,
            fontSize: coerceFontSize(monoFont?.fontSize, 12),
            color: textPrimary,
          }}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th
        style={{
          textAlign: "left",
          padding: "8px 10px",
          borderBottom: `1px solid ${borderColor}`,
          background: withAlpha(cardBackground, 0.65),
          fontWeight: 700,
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        style={{
          padding: "8px 10px",
          borderBottom: `1px solid ${withAlpha(borderColor, 0.75)}`,
          verticalAlign: "top",
        }}
      >
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: accent, textDecoration: "underline" }}
      >
        {children}
      </a>
    ),
  }

  return (
    <div
      className="daisy-chat-markdown"
      style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
