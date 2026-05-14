const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws"
const WS_TOPICS = (
  import.meta.env.VITE_WS_TOPICS ??
  `${import.meta.env.VITE_WS_TOPIC ?? "/robot/device/state"},/robot/device/event,/robot/device/throughput`
)
  .split(",")
  .map((x: string) => x.trim())
  .filter(Boolean)
const STOMP_ACCEPT_VERSION = "1.2,1.1,1.0"

export function createSocket(onMessage: (data: unknown) => void) {
  const socket = new WebSocket(WS_URL, ["v12.stomp", "v11.stomp", "v10.stomp"])

  socket.onopen = () => {
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
          for (const [idx, topic] of WS_TOPICS.entries()) {
            socket.send(
              buildFrame("SUBSCRIBE", {
                id: `robot-sub-${idx}`,
                destination: topic,
                ack: "auto",
              })
            )
          }
          continue
        }

        if (frame.command === "MESSAGE") {
          const body = frame.body.trim()
          if (!body) continue
          try {
            const parsed = JSON.parse(body)
            // Sometimes body is JSON-stringified twice.
            if (typeof parsed === "string") {
              try {
                const nested = JSON.parse(parsed)
                onMessage(nested)
              } catch {
                onMessage(parsed)
              }
            } else {
              onMessage(parsed)
            }
          } catch {
            onMessage(body)
          }
          continue
        }

        if (frame.command === "ERROR") continue
      }
    }

    // Backward compatibility: if backend still emits plain JSON.
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch {
      // Ignore non-JSON, non-STOMP payloads.
    }
  }

  socket.onclose = () => {}

  socket.onerror = () => {}

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