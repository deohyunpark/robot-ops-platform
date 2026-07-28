const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws"
const FEED_TOPIC = "/robot/device/feed"
const WS_TOPICS = normalizeTopics(
  (
    import.meta.env.VITE_WS_TOPICS ??
    `${import.meta.env.VITE_WS_TOPIC ?? "/robot/device/state"},/robot/device/event,/robot/device/events,/robot/device/throughput,/robot/device/offline,/robot/device/totalUtilization,${FEED_TOPIC}`
  )
    .split(",")
    .map((x: string) => x.trim())
    .filter(Boolean)
)
const STOMP_ACCEPT_VERSION = "1.2,1.1,1.0"

function normalizeTopics(topics: string[]): string[] {
  const merged = [...topics]
  if (!merged.some((t) => t === FEED_TOPIC || t.endsWith(FEED_TOPIC))) {
    merged.push(FEED_TOPIC)
  }
  return Array.from(new Set(merged))
}

function isFeedDestination(destination?: string): boolean {
  const d = (destination ?? "").trim().toLowerCase()
  return d.includes("/robot/device/feed")
}

function looksLikeInsightFeedPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const root = data as Record<string, unknown>
  const candidates: Record<string, unknown>[] = [root]
  if (root.payload && typeof root.payload === "object") {
    candidates.push(root.payload as Record<string, unknown>)
  }
  if (root.data && typeof root.data === "object") {
    candidates.push(root.data as Record<string, unknown>)
  }
  return candidates.some(
    (candidate) =>
      "insightResponses" in candidate ||
      "insight_responses" in candidate ||
      "riskResponse" in candidate ||
      "risk_response" in candidate ||
      "currentSituation" in candidate ||
      "current_situation" in candidate ||
      "possibleCause" in candidate ||
      "possible_cause" in candidate
  )
}

function logInsightFeedMessage(
  destination: string,
  payload: unknown,
  rawBody?: string
) {
  if (!isFeedDestination(destination) && !looksLikeInsightFeedPayload(payload)) {
    return
  }
  console.log("[WS /robot/device/feed]", {
    destination: destination.trim() || "(unknown)",
    receivedAt: new Date().toISOString(),
    payload,
    rawBodyPreview:
      typeof rawBody === "string" ? rawBody.slice(0, 1200) : undefined,
  })
}

export function createSocket(
  onMessage: (data: unknown, meta?: { destination?: string }) => void
) {
  const socket = new WebSocket(WS_URL, ["v12.stomp", "v11.stomp", "v10.stomp"])

  socket.onopen = () => {
    console.info("[WS] opening", WS_URL)
    socket.send(
      buildFrame("CONNECT", {
        "accept-version": STOMP_ACCEPT_VERSION,
        "heart-beat": "10000,10000",
      })
    )
  }

  socket.onmessage = (event) => {
    const raw = typeof event.data === "string" ? event.data : ""
    const decodedChunks = decodeTransportPayload(raw)

    for (const chunk of decodedChunks) {
      const frames = splitFrames(chunk)
      for (const frameText of frames) {
        const frame = parseFrame(frameText)
        if (!frame) continue

        if (frame.command === "CONNECTED") {
          console.info("[WS] connected", WS_URL)
          console.info("[WS] subscribe topics", WS_TOPICS)
          for (const [idx, topic] of WS_TOPICS.entries()) {
            socket.send(
              buildFrame("SUBSCRIBE", {
                id: `robot-sub-${idx}`,
                destination: topic,
                ack: "auto",
              })
            )
            if (topic === FEED_TOPIC || topic.endsWith(FEED_TOPIC)) {
              console.info("[WS] subscribed feed topic", topic)
            }
          }
          continue
        }

        if (frame.command === "MESSAGE") {
          const body = frame.body.trim()
          if (!body) continue
          const destination =
            frame.headers.destination ??
            frame.headers.Destination ??
            ""
          try {
            const parsed = JSON.parse(body)
            // Sometimes body is JSON-stringified twice.
            if (typeof parsed === "string") {
              try {
                const nested = JSON.parse(parsed)
                logInsightFeedMessage(destination, nested, body)
                onMessage(nested, { destination })
              } catch {
                logInsightFeedMessage(destination, parsed, body)
                onMessage(parsed, { destination })
              }
            } else {
              logInsightFeedMessage(destination, parsed, body)
              onMessage(parsed, { destination })
            }
          } catch {
            logInsightFeedMessage(destination, body, body)
            onMessage(body, { destination })
          }
          continue
        }

        if (frame.command === "ERROR") continue
      }
    }

    // Backward compatibility: if backend still emits plain JSON.
    try {
      const data = JSON.parse(event.data)
      logInsightFeedMessage("", data, event.data)
      onMessage(data, {})
    } catch {
      // Ignore non-JSON, non-STOMP payloads.
    }
  }

  socket.onclose = (event) => {
    console.warn("[WS] closed", event.code, event.reason || "")
  }

  socket.onerror = () => {
    console.error("[WS] error", WS_URL)
  }

  return socket
}

function decodeTransportPayload(raw: string): string[] {
  if (!raw) return []
  // SockJS message frame format: a["...","..."]
  if (raw.startsWith("a[")) {
    try {
      const arr = JSON.parse(raw.slice(1)) as string[]
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
    } catch {
      return [raw]
    }
  }
  return [raw]
}

function buildFrame(command: string, headers: Record<string, string>, body = "") {
  const lines = [command, ...Object.entries(headers).map(([k, v]) => `${k}:${v}`), "", body]
  return `${lines.join("\n")}\u0000`
}

function splitFrames(raw: string): string[] {
  return raw
    .split("\u0000")
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseFrame(raw: string) {
  const normalized = raw.replace(/\r\n/g, "\n")
  const [head, ...rest] = normalized.split("\n\n")
  if (!head) return null

  const headLines = head.split("\n")
  const command = headLines[0]?.trim()
  if (!command) return null

  const headers: Record<string, string> = {}
  for (const line of headLines.slice(1)) {
    const idx = line.indexOf(":")
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    headers[key] = value
  }

  return {
    command,
    headers,
    body: rest.join("\n\n"),
  }
}
