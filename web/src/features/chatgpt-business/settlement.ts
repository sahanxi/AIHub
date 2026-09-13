export function formatSettlementCNY(amount: number): string {
  if (!Number.isFinite(amount)) return '-'
  return `¥${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

export function settlePreviewCNY(
  amount: string,
  currency: string,
  usdToCnyRate: number
): number {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value)) return Number.NaN
  if (currency === 'CNY') return value
  return value * usdToCnyRate
}

export function formatBusinessSettlement(
  amount: string,
  currency: string,
  usdToCnyRate: number
) {
  const cny = settlePreviewCNY(amount, currency, usdToCnyRate)
  return {
    cny,
    cnyLabel: formatSettlementCNY(cny),
    usesExchange: currency !== 'CNY',
  }
}
