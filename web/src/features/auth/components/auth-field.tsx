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
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export const AUTH_TERMS_HREF = 'https://www.xzsmart.top/en/terms'
export const AUTH_PRIVACY_HREF = 'https://www.xzsmart.top/en/privacy'

export const AUTH_INPUT_CLASS =
  'h-12 rounded-xl border-[#D7DFDC] bg-white/75 pl-11 text-sm text-[#111827] shadow-[inset_0_1px_2px_rgba(17,24,39,0.02)] backdrop-blur-sm placeholder:text-[#98A2B3] hover:border-[#BFCBC7] focus-visible:border-[#248F78] focus-visible:ring-[#248F78]/16 aria-invalid:border-[#D92D20] aria-invalid:ring-[#D92D20]/15'

export const AUTH_SUBMIT_CLASS =
  'h-12 w-full justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#2AA789_0%,#248F78_55%,#1E7C69_100%)] text-base font-semibold text-white shadow-[0_10px_24px_rgba(36,143,120,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-105 hover:text-white active:brightness-95 disabled:opacity-50'

export const AUTH_OAUTH_CLASS =
  'h-12 w-full justify-center gap-2.5 rounded-xl border-[#D7DFDC] bg-white/70 font-medium text-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm hover:border-[#BFCBC7] hover:bg-white'

export const AUTH_LINK_CLASS =
  'font-medium text-[#248F78] underline-offset-4 hover:text-[#1F7E6A] hover:underline'

export const AUTH_SOFT_LINK_CLASS =
  'text-sm font-medium text-[#248F78] hover:text-[#1F7E6A] hover:underline'

export function AuthLeadingField(props: {
  icon: LucideIcon
  children: ReactNode
}) {
  const Icon = props.icon

  return (
    <div className='relative'>
      <Icon
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[#98A2B3]'
      />
      {props.children}
    </div>
  )
}

export function AuthOrDivider(props: { className?: string; label?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cn('relative', props.className)}>
      <div className='absolute inset-0 flex items-center'>
        <span className='w-full border-t border-[#E5E7EB]' />
      </div>
      <div className='relative flex justify-center text-[13px]'>
        <span className='bg-white px-3 text-[#98A2B3]'>
          {props.label ?? t('Or continue with')}
        </span>
      </div>
    </div>
  )
}
