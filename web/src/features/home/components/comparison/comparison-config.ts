import {
  FileText,
  Gem,
  Globe,
  Headset,
  Layers,
  Shield,
  Tag,
  User,
  type LucideIcon,
} from 'lucide-react'

export type ComparisonRowKey =
  | 'modelSource'
  | 'subscription'
  | 'resourceQuality'
  | 'network'
  | 'security'
  | 'compliance'
  | 'pricing'
  | 'support'

export type ComparisonRowConfig = {
  key: ComparisonRowKey
  icon: LucideIcon
}

export const COMPARISON_ROWS: ComparisonRowConfig[] = [
  { key: 'modelSource', icon: Layers },
  { key: 'subscription', icon: User },
  { key: 'resourceQuality', icon: Gem },
  { key: 'network', icon: Globe },
  { key: 'security', icon: Shield },
  { key: 'compliance', icon: FileText },
  { key: 'pricing', icon: Tag },
  { key: 'support', icon: Headset },
]

export type PromoBenefitKey =
  | 'quality'
  | 'discount'
  | 'stable'
  | 'easy'

export const PROMO_BENEFIT_KEYS: PromoBenefitKey[] = [
  'quality',
  'discount',
  'stable',
  'easy',
]
