const RUB = new Intl.NumberFormat('ru-Ru',{
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})


export function formatRub(value: number):string{
  return RUB.format(value)
}


const DT_SHORT = new Intl.DateTimeFormat('ru-RU',{
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatEventStart(iso: string): string{
  return DT_SHORT.format(new Date(iso))
}


export function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}


export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : null
}


// work_hours хранится как JSONB: либо простая строка ("08:00-23:00"), либо
// объект «день: часы» ({"Пн-Пт": "08:00-23:00"}). Приводим к одной строке для
// показа; пусто/{} → null (тогда блок часов не рисуем).
export function formatWorkHours(
  wh: Record<string, unknown> | string | null | undefined,
): string | null {
  if (!wh) return null
  if (typeof wh === 'string') return wh.trim() || null
  const parts: string[] = []
  for (const [day, hours] of Object.entries(wh)) {
    if (typeof hours === 'string') parts.push(`${day}: ${hours}`)
  }
  return parts.length ? parts.join(', ') : null
}
