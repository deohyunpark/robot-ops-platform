import { API_BASE_URL } from "./apiBaseUrl"

export type DemoSessionResponse = {
  status: string
  expireAt: string
}

export type DemoStatusResponse = {
  status: string
  remainingSeconds: number
}

function parseDemoStatusResponse(json: unknown): DemoStatusResponse {
  if (!json || typeof json !== "object") {
    throw new Error("Demo status API returned an invalid response")
  }
  const row = json as Partial<DemoStatusResponse>
  if (typeof row.status !== "string") {
    throw new Error("Demo status API returned an invalid response")
  }
  const remainingSeconds =
    typeof row.remainingSeconds === "number"
      ? row.remainingSeconds
      : Number(row.remainingSeconds)
  if (!Number.isFinite(remainingSeconds)) {
    throw new Error("Demo status API returned an invalid response")
  }
  return { status: row.status, remainingSeconds }
}

export function demoExpiresAtFromStatus(
  status: DemoStatusResponse,
  now = Date.now()
): number | null {
  if (status.remainingSeconds <= 0) return null
  if (status.status.toUpperCase() !== "RUNNING") return null
  return now + status.remainingSeconds * 1000
}

/**
 * GET /v1/demo/status
 */
export async function fetchDemoStatus(
  signal?: AbortSignal
): Promise<DemoStatusResponse> {
  const url = `${API_BASE_URL}/v1/demo/status`
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Demo status API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json: unknown = await res.json()
  return parseDemoStatusResponse(json)
}

/**
 * POST /v1/demo/start
 */
export async function postDemoStart(
  signal?: AbortSignal
): Promise<DemoSessionResponse> {
  const url = `${API_BASE_URL}/v1/demo/start`
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Demo start API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
  const json = (await res.json()) as Partial<DemoSessionResponse>
  if (typeof json.status !== "string" || typeof json.expireAt !== "string") {
    throw new Error("Demo start API returned an invalid response")
  }
  return { status: json.status, expireAt: json.expireAt }
}

/**
 * POST /v1/demo/stop
 */
export async function postDemoStop(signal?: AbortSignal): Promise<void> {
  const url = `${API_BASE_URL}/v1/demo/stop`
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Demo stop API ${res.status}: ${text || res.statusText || "request failed"}`
    )
  }
}
