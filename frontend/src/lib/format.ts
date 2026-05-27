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
