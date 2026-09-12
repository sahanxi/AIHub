export function formatMoney(amount: string, currency: string) {
  if (currency === 'CNY') return `¥${amount}`
  if (currency === 'USD') return `$${amount}`
  return `${currency} ${amount}`
}

export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatPeriod(start: number, end: number) {
  return `${formatDate(start)} – ${formatDate(end)}`
}
