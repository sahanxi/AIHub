export const BUSINESS_WORKSPACE_PROVIDERS = ['OPENAI'] as const

export const BUSINESS_BILLING_CADENCES = ['MONTHLY', 'ANNUAL'] as const

export const BUSINESS_WORKSPACE_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
] as const

export const BUSINESS_PRICE_CURRENCIES = ['CNY', 'USD'] as const

export function getProviderLabelKey(provider: string): string {
  if (provider === 'OPENAI') {
    return 'OpenAI ChatGPT Business'
  }
  return provider
}

export function getBillingCadenceLabelKey(cadence: string): string {
  if (cadence === 'MONTHLY') {
    return 'Monthly billing'
  }
  if (cadence === 'ANNUAL') {
    return 'Annual billing'
  }
  return cadence
}

export function getTimezoneLabelKey(timezone: string): string {
  switch (timezone) {
    case 'Asia/Shanghai':
      return 'Asia/Shanghai (China Standard Time)'
    case 'Asia/Hong_Kong':
      return 'Asia/Hong_Kong (Hong Kong Time)'
    case 'UTC':
      return 'UTC (Coordinated Universal Time)'
    case 'America/Los_Angeles':
      return 'America/Los_Angeles (Pacific Time)'
    case 'America/New_York':
      return 'America/New_York (Eastern Time)'
    case 'Europe/London':
      return 'Europe/London (UK Time)'
    default:
      return timezone
  }
}
