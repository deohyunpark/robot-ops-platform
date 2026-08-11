import { API_BASE_URL } from "./apiBaseUrl"

export type AckRequest = {
  eventId: number
  operator: string
}

export type ActionChecklistItemResponse = {
  id: number
  content: string
  sequence: number
  checked: boolean
}

export type AckResponse = {
  checkListId: number
  operation: string
  ackStartTime: string
  actionChecklistItemResponses: ActionChecklistItemResponse[]
}

export type CheckListItemSaveRequest = {
  id: number
  checked: boolean
}

export type CheckListSaveRequest = {
  description: string
  itemSaveRequests: CheckListItemSaveRequest[]
}

function parseActionChecklistItem(raw: unknown): ActionChecklistItemResponse | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = Number(row.id)
  const content = typeof row.content === "string" ? row.content.trim() : ""
  const sequence = Number(row.sequence)
  if (!Number.isFinite(id) || !content) return null
  return {
    id,
    content,
    sequence: Number.isFinite(sequence) ? sequence : 0,
    checked: Boolean(row.checked),
  }
}

function parseAckResponse(raw: unknown): AckResponse | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const checkListId = Number(row.checkListId)
  const operation =
    (typeof row.operation === "string" && row.operation.trim()) ||
    (typeof row.operator === "string" && row.operator.trim()) ||
    ""
  const ackStartTime =
    (typeof row.ackStartTime === "string" && row.ackStartTime) ||
    (typeof row.createdAt === "string" && row.createdAt) ||
    ""
  const itemsRaw = row.actionChecklistItemResponses
  const actionChecklistItemResponses = Array.isArray(itemsRaw)
    ? itemsRaw
        .map(parseActionChecklistItem)
        .filter((item): item is ActionChecklistItemResponse => !!item)
    : []
  if (!Number.isFinite(checkListId) || !operation) return null
  return {
    checkListId,
    operation,
    ackStartTime,
    actionChecklistItemResponses,
  }
}

async function readApiError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "")
  return text || res.statusText || "request failed"
}

/**
 * POST /v1/events/ack — 담당자 저장, 체크리스트 생성
 */
export async function postEventAck(
  body: AckRequest,
  signal?: AbortSignal
): Promise<AckResponse> {
  const url = `${API_BASE_URL}/v1/events/ack`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    throw new Error(`Event ack API ${res.status}: ${await readApiError(res)}`)
  }
  const json: unknown = await res.json()
  const parsed = parseAckResponse(json)
  if (!parsed) {
    throw new Error("Event ack API returned an invalid response.")
  }
  return parsed
}

/**
 * GET /v1/events/{eventId}/action — 기존 조치/체크리스트 조회
 */
export async function fetchEventAction(
  eventId: number,
  signal?: AbortSignal
): Promise<AckResponse | null> {
  const url = `${API_BASE_URL}/v1/events/${eventId}/action`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Event action API ${res.status}: ${await readApiError(res)}`)
  }
  const json: unknown = await res.json()
  return parseAckResponse(json)
}

/**
 * POST /v1/events/{eventActionId}/items — 체크리스트/메모 중간 저장
 */
export async function saveEventActionItems(
  eventActionId: number,
  body: CheckListSaveRequest,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_BASE_URL}/v1/events/${eventActionId}/items`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    throw new Error(`Event items API ${res.status}: ${await readApiError(res)}`)
  }
}

/**
 * POST /v1/events/{eventId}/resolve — 조치 완료
 */
export async function postEventResolve(
  eventId: number,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_BASE_URL}/v1/events/${eventId}/resolve`
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    throw new Error(`Event resolve API ${res.status}: ${await readApiError(res)}`)
  }
}

export function parseBackendEventId(id: string | null | undefined): number | null {
  if (id == null) return null
  const trimmed = String(id).trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
