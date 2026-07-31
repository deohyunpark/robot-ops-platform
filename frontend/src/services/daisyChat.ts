/**
 * POST /api/daisy/chat
 */
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

function apiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (import.meta.env.DEV) return ""
  return "http://localhost:8080"
}

export type DaisyChatResponse = {
  answer: string
}

export async function postDaisyChat(
  request: string,
  signal?: AbortSignal
): Promise<string> {
  const text = request.trim()
  if (!text) {
    throw new DaisyChatError("client")
  }

  const base = apiBaseUrl()
  const url = `${base}/api/daisy/chat`

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
