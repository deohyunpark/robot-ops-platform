/**
 * POST /v1/daisy/chat
 */
import { API_BASE_URL } from "./apiBaseUrl"
import { normalizeDaisyAnswer } from "./daisyChatFormat"

export type DaisyChatErrorKind = "network" | "server" | "client" | "empty" | "unknown"

export class DaisyChatError extends Error {
  readonly kind: DaisyChatErrorKind

  constructor(kind: DaisyChatErrorKind) {
    super(kind)
    this.name = "DaisyChatError"
    this.kind = kind
  }
}

export function getDaisyChatUserMessage(
  err: unknown,
  language: "ko" | "en" = "ko"
): string {
  const ko = language === "ko"
  const kind = resolveDaisyChatErrorKind(err)

  switch (kind) {
    case "network":
      return ko
        ? "네트워크 연결을 확인한 뒤 다시 시도해 주세요."
        : "Please check your network connection and try again."
    case "server":
      return ko
        ? "Daisy가 일시적으로 응답하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "Daisy is temporarily unavailable. Please try again in a moment."
    case "client":
      return ko
        ? "요청을 처리할 수 없습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요."
        : "We couldn't process your request. Please check your input and try again."
    case "empty":
      return ko
        ? "Daisy가 응답을 생성하지 못했습니다. 다시 질문해 주세요."
        : "Daisy could not generate a response. Please ask again."
    default:
      return ko
        ? "Daisy 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "Could not get a response from Daisy. Please try again in a moment."
  }
}

function resolveDaisyChatErrorKind(err: unknown): DaisyChatErrorKind {
  if (err instanceof DaisyChatError) return err.kind
  if (err instanceof Error) {
    if (err.name === "AbortError") return "unknown"
    const message = err.message
    if (/Failed to fetch|NetworkError|network/i.test(message)) return "network"
    if (/API 5\d{2}|\b5\d{2}\b/.test(message)) return "server"
    if (/API 4\d{2}|\b4\d{2}\b/.test(message)) return "client"
    if (/empty answer/i.test(message)) return "empty"
  }
  return "unknown"
}

export type DaisyChatResponse = {
  answer: string
}

export type DaisyChatMessage = {
  role: "user" | "assistant"
  text: string
  ts: string
  showDailyReportPdf?: boolean
}

const DAILY_REPORT_QUESTION_PATTERNS = [
  /일일\s*(운영\s*)?(보고서|리포트)/i,
  /데일리\s*리포트/i,
  /daily\s*report/i,
  /오늘\s*(하루\s*)?(운영\s*)?(요약|정리|리포트|보고)/i,
  /금일\s*(운영\s*)?(요약|정리|리포트|보고)/i,
  /하루\s*(운영\s*)?(요약|정리|리포트|보고)/i,
  /오늘\s.*(이벤트|운영).*(요약|정리)/i,
  /(요약|정리|리포트|보고).*(해줘|해주|부탁|알려)/i,
  /today'?s?\s*(operations?\s*)?(summary|report|recap)/i,
  /summarize\s*today/i,
  /end\s*of\s*day\s*report/i,
]

/** 일일 리포트/요약류 질문 — PDF 추출 버튼 노출 */
export function isDailyReportChatRequest(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) return false
  return DAILY_REPORT_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function getDailyReportPdfUserMessage(
  err: unknown,
  language: "ko" | "en" = "ko"
): string {
  const ko = language === "ko"
  if (err instanceof DaisyChatError) {
    switch (err.kind) {
      case "network":
        return ko
          ? "네트워크 연결을 확인한 뒤 PDF를 다시 받아 주세요."
          : "Please check your network connection and try again."
      case "server":
        return ko
          ? "PDF 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
          : "PDF report generation failed. Please try again in a moment."
      default:
        break
    }
  }
  return ko
    ? "PDF 리포트를 다운로드하지 못했습니다."
    : "Could not download the PDF report."
}

export async function downloadDaisyDailyReportPdf(signal?: AbortSignal): Promise<void> {
  const url = `${API_BASE_URL}/v1/daisy/daily/report`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/pdf",
      },
      signal,
    })
  } catch {
    throw new DaisyChatError("network")
  }

  if (!res.ok) {
    if (res.status >= 500) throw new DaisyChatError("server")
    if (res.status >= 400) throw new DaisyChatError("client")
    throw new DaisyChatError("unknown")
  }

  const blob = await res.blob()
  if (!blob.size) {
    throw new DaisyChatError("empty")
  }

  const date = new Date().toISOString().slice(0, 10)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = `robotops-daily-report-${date}.pdf`
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function postDaisyChat(
  request: string,
  signal?: AbortSignal
): Promise<string> {
  const text = request.trim()
  if (!text) {
    throw new DaisyChatError("client")
  }

  const url = `${API_BASE_URL}/v1/daisy/chat`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ request: text }),
      signal,
    })
  } catch {
    throw new DaisyChatError("network")
  }

  if (!res.ok) {
    if (res.status >= 500) throw new DaisyChatError("server")
    if (res.status >= 400) throw new DaisyChatError("client")
    throw new DaisyChatError("unknown")
  }

  let json: Partial<DaisyChatResponse>
  try {
    json = (await res.json()) as Partial<DaisyChatResponse>
  } catch {
    throw new DaisyChatError("server")
  }

  const answer = typeof json.answer === "string" ? json.answer.trim() : ""
  if (!answer) {
    throw new DaisyChatError("empty")
  }
  return normalizeDaisyAnswer(answer)
}
