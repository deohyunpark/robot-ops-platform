export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function withAlpha(hexOrRgba: string, a: number) {
  const s = `${hexOrRgba}`.trim()
  if (s.startsWith("rgba(")) {
    const parts = s
      .replace("rgba(", "")
      .replace(")", "")
      .split(",")
      .map((x) => x.trim())
    if (parts.length === 4)
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamp(a, 0, 1)})`
    return s
  }
  if (s.startsWith("rgb(")) {
    const parts = s
      .replace("rgb(", "")
      .replace(")", "")
      .split(",")
      .map((x) => x.trim())
    if (parts.length === 3)
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamp(a, 0, 1)})`
    return s
  }
  const hex = s.replace("#", "")
  if (!(hex.length === 3 || hex.length === 6)) return s
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${clamp(a, 0, 1)})`
}

export function coerceFontSize(fontSize: unknown, fallback: number) {
  if (typeof fontSize === "number") return fontSize
  if (typeof fontSize === "string") {
    const n = parseFloat(fontSize)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function formatTemp(t: number) {
  const v = Math.round(t * 10) / 10
  return `${v.toFixed(1)}°C`
}

export function formatBattery(v: number) {
  if (!Number.isFinite(v)) return "0"
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export function formatKoreanDateTime(iso?: string) {
  if (!iso) return "-"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "-"
  return new Date(t).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function formatKoreanRelativeTime(iso?: string) {
  if (!iso) return "-"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "-"

  const diffMs = Date.now() - t
  if (diffMs < 0) return "방금 전"

  const sec = Math.floor(diffMs / 1000)
  if (sec < 5) return "방금 전"
  if (sec < 60) return `${sec}초 전`

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`

  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`

  const day = Math.floor(hour / 24)
  return `${day}일 전`
}
