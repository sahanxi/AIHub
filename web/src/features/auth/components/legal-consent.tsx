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
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import type { SystemStatus } from '../types'

interface LegalConsentProps {
  status: SystemStatus | null
  checked: boolean
  onCheckedChange: (nextValue: boolean) => void
  className?: string
  alwaysShow?: boolean
  termsHref?: string
  privacyHref?: string
  variant?: 'card' | 'plain'
}

export function LegalConsent({
  status,
  checked,
  onCheckedChange,
  className,
  alwaysShow = false,
  termsHref,
  privacyHref,
  variant = 'card',
}: LegalConsentProps) {
  const { t } = useTranslation()
  const hasUserAgreement = alwaysShow || Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = alwaysShow || Boolean(status?.privacy_policy_enabled)

  if (!hasUserAgreement && !hasPrivacyPolicy) {
    return null
  }

  const handleChange = (value: boolean) => {
    onCheckedChange(value === true)
  }

  const agreementHref = termsHref ?? '/user-agreement'
  const policyHref = privacyHref ?? '/privacy-policy'

  return (
    <div
      className={cn(
        'flex items-start gap-2.5',
        variant === 'card' &&
          'border-border/60 bg-muted/40 rounded-md border p-3',
        className
      )}
    >
      <Checkbox
        id='legal-consent'
        checked={checked}
        onCheckedChange={handleChange}
        className='mt-0.5 rounded-[4px] border-[#D0D5DD] data-checked:border-[#248F78] data-checked:bg-[#248F78]'
      />
      <Label
        htmlFor='legal-consent'
        className='items-start gap-1 text-left text-[13px] leading-5 font-normal text-[#667085]'
      >
        <span>
          {t('I have read and agree to the')}{' '}
          {hasUserAgreement && (
            <a
              href={agreementHref}
              target='_blank'
              rel='noopener noreferrer'
              className='font-medium text-[#248F78] hover:underline'
            >
              《{t('User Agreement')}》
            </a>
          )}
          {hasUserAgreement && hasPrivacyPolicy && ` ${t('and')} `}
          {hasPrivacyPolicy && (
            <a
              href={policyHref}
              target='_blank'
              rel='noopener noreferrer'
              className='font-medium text-[#248F78] hover:underline'
            >
              《{t('Privacy Policy')}》
            </a>
          )}
        </span>
      </Label>
    </div>
  )
}
