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
