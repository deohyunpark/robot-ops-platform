export type DaisyEventField = { label: string; value: string }

export type DaisyEventCard = {
  index: number
  robotId: string
  eventType: string
  severity: string
  occurredAt: string
  details: DaisyEventField[]
  detailRaw: string
}

export type DaisyContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | { type: "eventReport"; intro: string; cards: DaisyEventCard[]; outro: string }

export type MarkdownListItem = {
  text: string
  children: MarkdownNode[]
}

export type MarkdownNode =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: MarkdownListItem[] }

const BULLET_PREFIX = /^[-*•·]\s+/
const ORDERED_PREFIX = /^\d+[.)]\s+/
const EVENT_ITEM_START = /\d+\.\s+\*\*RBT-/i
const MARKDOWN_SUMMARY_HINT = /#{1,6}\s/

/** API/LLM raw text → readable multiline text */
export function normalizeDaisyAnswer(raw: string): string {
  let text = raw.trim()
  if (!text) return ""

  if (text.includes("\\n") || text.includes("\\t")) {
    text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"')
  }

  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>
      const nested =
        obj.answer ?? obj.content ?? obj.message ?? obj.text ?? obj.response
      if (typeof nested === "string" && nested.trim()) {
        return normalizeDaisyAnswer(nested)
      }
      if (Array.isArray(obj.items)) {
        return obj.items
          .map((row) => (typeof row === "string" ? row : JSON.stringify(row, null, 2)))
          .join("\n")
      }
    } catch {
      // keep original text
    }
  }

  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const skipEventExpand =
    looksLikeEventReport(text) || MARKDOWN_SUMMARY_HINT.test(text)
  text = expandInlineStructure(text, { skipEventExpand })

  return text
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function expandInlineStructure(
  text: string,
  options: { skipEventExpand?: boolean } = {}
): string {
  let out = text

  if (!options.skipEventExpand && EVENT_ITEM_START.test(out)) {
    out = expandDaisyEventList(out)
  }

  return out
    .replace(/([.!?])\s+(?=[-*•·]\s)/g, "$1\n")
    .replace(/([.!?])\s+(?=\d+[.)]\s)/g, "$1\n")
    .replace(/\s+([-•·*])\s+/g, "\n$1 ")
    .replace(/\s+(?=\d+[.)]\s)/g, "\n")
    .replace(/:\s+(?=[-*•·]\s)/g, ":\n")
}

function expandDaisyEventList(text: string): string {
  const firstItem = text.search(EVENT_ITEM_START)
  if (firstItem < 0) return text

  const intro = text.slice(0, firstItem).trim()
  let body = text.slice(firstItem).trim()

  let outro = ""
  const outroMatch = body.match(/\s+(이외에도[\s\S]*)$/)
  if (outroMatch?.index != null) {
    outro = outroMatch[1].trim()
    body = body.slice(0, outroMatch.index).trim()
  }

  const items = body
    .split(/\s+(?=\d+\.\s+\*\*RBT-)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const formattedItems = items.map(formatEventItemChunk).join("\n\n")
  return [intro, formattedItems, outro].filter(Boolean).join("\n\n")
}

function formatEventItemChunk(chunk: string): string {
  const head = chunk.match(/^(\d+)\.\s+\*\*([^*]+)\*\*/)
  if (!head) return chunk

  const index = head[1]
  const robotId = head[2].trim()
  const rest = chunk.slice(head[0].length).replace(/^\s*-\s*/, "").trim()

  const fieldChunks = rest.split(/\s+-\s+\*\*/).map((part, i) => {
    if (i === 0 && part.startsWith("**")) return part.slice(2)
    return part.startsWith("**") ? part.slice(2) : part
  })

  const lines: string[] = [`${index}. **${robotId}**`]

  for (const fieldChunk of fieldChunks) {
    const colon = fieldChunk.indexOf(":**")
    if (colon > 0) {
      const label = fieldChunk.slice(0, colon).trim()
      let value = fieldChunk.slice(colon + 3).trim()
      if (label.includes("상세 정보")) {
        value = formatPayloadBrace(value)
        lines.push(`  **${label}:**`)
        lines.push(`  ${value.replace(/\n/g, "\n  ")}`)
      } else {
        lines.push(`  **${label}:** ${value}`)
      }
      continue
    }
    if (fieldChunk.trim()) lines.push(`  ${fieldChunk.trim()}`)
  }

  return lines.join("\n")
}

function formatPayloadBrace(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return trimmed

  const inner = trimmed.slice(1, -1).trim()
  if (!inner) return trimmed

  const pairs = inner.split(/,\s+(?=[A-Za-z_][\w.]*=)/)
  if (pairs.length <= 1) return trimmed

  return `{\n    ${pairs.map((p) => p.trim()).join(",\n    ")}\n  }`
}

function looksLikeEventReport(text: string): boolean {
  return /\d+\.\s+\*\*RBT-/i.test(text)
}

/** `###` 요약 등 — 전체 마크다운 렌더링 우선 */
export function hasDaisyMarkdownStructure(text: string): boolean {
  return MARKDOWN_SUMMARY_HINT.test(text)
}

function splitEventReport(text: string): {
  intro: string
  items: string[]
  outro: string
} {
  const firstItem = text.search(EVENT_ITEM_START)
  if (firstItem < 0) return { intro: text, items: [], outro: "" }

  const intro = text.slice(0, firstItem).trim()
  let body = text.slice(firstItem).trim()

  let outro = ""
  const outroMatch = body.match(/\s+(이외에도[\s\S]*)$/)
  if (outroMatch?.index != null) {
    outro = outroMatch[1].trim()
    body = body.slice(0, outroMatch.index).trim()
  }

  const items = body
    .split(/\s+(?=\d+\.\s+\*\*RBT-)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  return { intro, items, outro }
}

function parseDetailPayload(raw: string): DaisyEventField[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return [{ label: "info", value: trimmed }]
  }

  const inner = trimmed.slice(1, -1).trim()
  if (!inner) return []

  return inner
    .split(/,\s+(?=[A-Za-z_][\w.]*=)/)
    .map((part) => {
      const eq = part.indexOf("=")
      if (eq <= 0) return null
      return {
        label: part.slice(0, eq).trim(),
        value: part.slice(eq + 1).trim(),
      }
    })
    .filter((x): x is DaisyEventField => !!x)
}

function parseEventCardChunk(chunk: string): DaisyEventCard | null {
  const head = chunk.match(/^(\d+)\.\s+\*\*([^*]+)\*\*/)
  if (!head) return null

  const card: DaisyEventCard = {
    index: Number(head[1]),
    robotId: head[2].trim(),
    eventType: "",
    severity: "",
    occurredAt: "",
    details: [],
    detailRaw: "",
  }

  const rest = chunk.slice(head[0].length).trim().replace(/^-\s*/, "")
  const fieldChunks = rest.split(/\s+-\s+\*\*/).map((part) => {
    const trimmed = part.trim()
    return trimmed.startsWith("**") ? trimmed.slice(2) : trimmed
  })

  for (const fieldChunk of fieldChunks) {
    const colon = fieldChunk.indexOf(":**")
    if (colon <= 0) continue

    const label = fieldChunk.slice(0, colon).trim()
    const value = fieldChunk.slice(colon + 3).trim()

    if (label.includes("이벤트 타입") || label.toLowerCase().includes("event type")) {
      card.eventType = value
    } else if (label.includes("심각도") || label.toLowerCase().includes("severity")) {
      card.severity = value
    } else if (label.includes("발생 시각") || label.toLowerCase().includes("occurred")) {
      card.occurredAt = formatTimestamp(value)
    } else if (label.includes("상세 정보") || label.toLowerCase().includes("detail")) {
      card.detailRaw = value
      card.details = parseDetailPayload(value)
    }
  }

  return card
}

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(parsed)
  } catch {
    return value
  }
}

function parseDaisyEventReport(text: string): DaisyContentBlock | null {
  if (!looksLikeEventReport(text)) return null

  const basic = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  const { intro, items, outro } = splitEventReport(basic)
  const cards = items
    .map(parseEventCardChunk)
    .filter((x): x is DaisyEventCard => !!x)

  if (!cards.length) return null

  return { type: "eventReport", intro, cards, outro }
}

export function tryParseDaisyEventReport(text: string): DaisyContentBlock | null {
  return parseDaisyEventReport(text)
}

function compactOrderedListBreaks(text: string): string {
  return text.replace(/\n+(?=\d+\.\s)/g, "\n")
}

/** `-` bullet을 직전 ordered 항목 아래 중첩 목록으로 들여쓰기 (GFM) */
function indentNestedListBullets(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  let inOrderedSubBullets = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      out.push("")
      inOrderedSubBullets = false
      continue
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      inOrderedSubBullets = false
      out.push(line)
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      inOrderedSubBullets = true
      out.push(line)
      continue
    }

    if (/^-\s/.test(trimmed) && inOrderedSubBullets) {
      out.push(`   ${trimmed}`)
      continue
    }

    if (/^-\s/.test(trimmed)) {
      inOrderedSubBullets = false
      out.push(line)
      continue
    }

    if (/^\(.+\)$/.test(trimmed) && inOrderedSubBullets) {
      out.push(`   ${trimmed}`)
      continue
    }

    inOrderedSubBullets = false
    out.push(line)
  }

  return out.join("\n")
}

/** Daisy LLM 한 줄 텍스트 → react-markdown용 GFM */
export function prepareDaisyMarkdown(raw: string): string {
  let text = normalizeDaisyAnswer(raw)
  if (!text) return ""

  text = text
    .replace(/:\s+(#{1,6}\s)/g, ":\n\n$1")
    .replace(/([.!?])\s+(#{1,6}\s)/g, "$1\n\n$2")
    .replace(/\s+(#{1,6}\s)/g, "\n\n$1")
    .replace(/(#{1,6}\s[^\n]+?)\s+(?=\d+\.\s+)/g, "$1\n\n")
    .replace(/(#{1,6}\s[^\n]+?)\s+-\s+/g, "$1\n")
    .replace(/(#{1,6}\s[^\n]+?)\s+\*\s+/g, "$1\n* ")
    .replace(/(\*\*[^*]+\*\*)\s+-\s+(?=\*\*RBT-|\()/g, "$1\n- ")
    .replace(/\n(\*\*RBT-)/g, "\n- $1")
    .replace(/\s+-\s+(?=\*\*RBT-)/g, "\n- ")
    .replace(/\s+-\s+(?=\()/g, "\n- ")
    .replace(/(\))\s+(?=\d+\.\s+)/g, "$1\n")
    .replace(/(\))\s+(#{1,6}\s)/g, "$1\n\n$2")
    .replace(/(#{1,6}\s[^\n]+)\n([^-\n#\d*][^\n]*)/g, (_, header, body) => {
      return `${header}\n${body.replace(/\s+-\s+/g, "\n- ")}`
    })
    .replace(/(###[^\n]+\n)([가-힣A-Za-z][^:\n]*:\s*[^-\n]+)/g, "$1- $2")
    .replace(/(건)\s+(이상입니다)/g, "$1\n\n$2")

  text = compactOrderedListBreaks(text)
  text = indentNestedListBullets(text)

  return text.replace(/\n{3,}/g, "\n\n").trim()
}

export function shouldUseDaisyEventReportCards(text: string): boolean {
  if (hasDaisyMarkdownStructure(text)) return false
  const report = tryParseDaisyEventReport(text)
  return report?.type === "eventReport" && report.cards.length > 0
}

export function parseDaisyMarkdown(text: string): MarkdownNode[] {
  const lines = prepareDaisyMarkdown(text).split("\n")
  const nodes: MarkdownNode[] = []
  let paragraph: string[] = []
  let currentList: { ordered: boolean; items: MarkdownListItem[] } | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    nodes.push({ type: "paragraph", text: paragraph.join(" ") })
    paragraph = []
  }

  const flushList = () => {
    if (currentList?.items.length) {
      nodes.push({
        type: "list",
        ordered: currentList.ordered,
        items: currentList.items,
      })
    }
    currentList = null
  }

  const flushAll = () => {
    flushParagraph()
    flushList()
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushAll()
      nodes.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      })
      continue
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      if (!currentList?.ordered) {
        flushList()
        currentList = { ordered: true, items: [] }
      }
      currentList.items.push({ text: ordered[1].trim(), children: [] })
      continue
    }

    const bullet = line.match(/^-\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      const bulletText = bullet[1].trim()
      if (currentList?.ordered && currentList.items.length) {
        const parent = currentList.items[currentList.items.length - 1]
        const nested = parent.children.find(
          (child): child is Extract<MarkdownNode, { type: "list" }> =>
            child.type === "list" && !child.ordered
        )
        if (nested) {
          nested.items.push({ text: bulletText, children: [] })
        } else {
          parent.children.push({
            type: "list",
            ordered: false,
            items: [{ text: bulletText, children: [] }],
          })
        }
        continue
      }

      if (!currentList || currentList.ordered) {
        flushList()
        currentList = { ordered: false, items: [] }
      }
      currentList.items.push({ text: bulletText, children: [] })
      continue
    }

    const robotLine = /^\*\*RBT-/i.test(line)
    if (robotLine && currentList?.ordered && currentList.items.length) {
      const parent = currentList.items[currentList.items.length - 1]
      const nested = parent.children.find(
        (child): child is Extract<MarkdownNode, { type: "list" }> =>
          child.type === "list" && !child.ordered
      )
      if (nested) {
        nested.items.push({ text: line, children: [] })
      } else {
        parent.children.push({
          type: "list",
          ordered: false,
          items: [{ text: line, children: [] }],
        })
      }
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushAll()
  return nodes
}

export function parseDaisyContentBlocks(text: string): DaisyContentBlock[] {
  const basic = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
  if (!basic) return []

  const eventReport = parseDaisyEventReport(basic)
  if (eventReport) return [eventReport]

  const normalized = normalizeDaisyAnswer(text)
  if (!normalized) return []

  const lines = normalized.split("\n")
  const blocks: DaisyContentBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: "code", text: codeLines.join("\n").trimEnd() })
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      })
      i += 1
      continue
    }

    if (BULLET_PREFIX.test(trimmed) || ORDERED_PREFIX.test(trimmed)) {
      const ordered = ORDERED_PREFIX.test(trimmed)
      const items: string[] = []
      while (i < lines.length) {
        const raw = lines[i]
        const t = raw.trim()
        if (!t) {
          i += 1
          if (items.length) break
          continue
        }
        const isItem = ordered ? ORDERED_PREFIX.test(t) : BULLET_PREFIX.test(t)
        const isIndented = /^\s{2,}|\t/.test(raw) && items.length > 0
        if (isItem) {
          items.push(t.replace(ordered ? ORDERED_PREFIX : BULLET_PREFIX, "").trim())
          i += 1
          continue
        }
        if (isIndented) {
          items[items.length - 1] = `${items[items.length - 1]} ${t.trim()}`
          i += 1
          continue
        }
        break
      }
      if (items.length) {
        blocks.push({ type: "list", ordered, items })
      }
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const raw = lines[i]
      const t = raw.trim()
      if (!t) break
      if (
        t.startsWith("```") ||
        /^(#{1,3})\s/.test(t) ||
        BULLET_PREFIX.test(t) ||
        ORDERED_PREFIX.test(t)
      ) {
        break
      }
      paragraphLines.push(t)
      i += 1
    }
    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") })
    }
  }

  return blocks
}

export type DaisyInlinePart = { type: "text" | "bold" | "code"; value: string }

export function parseDaisyInline(text: string): DaisyInlinePart[] {
  const parts: DaisyInlinePart[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) })
    }
    const token = match[0]
    if (token.startsWith("`")) {
      parts.push({ type: "code", value: token.slice(1, -1) })
    } else {
      parts.push({ type: "bold", value: token.slice(2, -2) })
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) })
  }
  if (!parts.length) {
    parts.push({ type: "text", value: text })
  }
  return parts
}

export function severityColor(
  severity: string,
  colors: { critical: string; warning: string; info: string; fallback: string }
): string {
  const x = severity.toUpperCase()
  if (x === "CRITICAL" || x === "ERROR") return colors.critical
  if (x === "WARN" || x === "WARNING") return colors.warning
  if (x === "INFO") return colors.info
  return colors.fallback
}
