/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
/**
 * Home page constants
 */
import { type TFunction } from 'i18next'

export const MAIN_BASE_CLASSES = 'bg-background text-foreground w-full'

export const AI_APPLICATIONS = [
  'LobeHub.Color',
  'Dify.Color',
  'OpenWebUI',
  'Cline',
] as const

export const AI_MODELS = ['OpenAI', 'Claude.Color', 'Gemini.Color'] as const

export const GATEWAY_FEATURES = [
  'Unified API',
  'Unified balance',
  'Pay as you go',
  'Clear usage',
] as const

export const DEFAULT_STATS = [
  {
    value: '3',
    suffix: '',
    description: 'first-party model providers',
  },
  {
    value: '1',
    suffix: '',
    description: 'OpenAI-compatible API',
  },
  {
    value: '1',
    suffix: '',
    description: 'wallet for all models',
  },
  {
    value: 'CNY',
    suffix: '',
    description: 'default billing currency',
  },
] as const

export const DEFAULT_FEATURES = [
  {
    title: 'Unified API',
    description:
      'Call GPT, Claude, and Gemini through one OpenAI-compatible endpoint.',
    iconName: 'Code',
  },
  {
    title: 'Unified balance',
    description: 'One wallet covers every model. Recharge once, use across providers.',
    iconName: 'Wallet',
  },
  {
    title: 'Pay as you go',
    description: 'Usage is billed by tokens. Check prices before you call.',
    iconName: 'DollarSign',
  },
  {
    title: 'Clear usage',
    description: 'See requests, tokens, and CNY spend per key and model.',
    iconName: 'BarChart3',
  },
] as const

export function getGatewayFeatures(t: TFunction) {
  return GATEWAY_FEATURES.map((feature) => t(feature))
}

export function getDefaultStats(t: TFunction) {
  return DEFAULT_STATS.map((stat) => ({
    ...stat,
    description: stat.description ? t(stat.description) : undefined,
  }))
}

export function getDefaultFeatures(t: TFunction) {
  return DEFAULT_FEATURES.map((feature) => ({
    ...feature,
    title: t(feature.title),
    description: t(feature.description),
  }))
}
