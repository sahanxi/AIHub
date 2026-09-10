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
import { Boxes, Users, Zap, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AuthHeroPanelProps = {
  systemName: string
}

type HeroStat = {
  icon: LucideIcon
  titleKey: string
  subtitleKey: string
}

const HERO_STATS: HeroStat[] = [
  {
    icon: Zap,
    titleKey: 'Higher efficiency',
    subtitleKey: 'Unlock productivity',
  },
  {
    icon: Users,
    titleKey: 'Team collaboration',
    subtitleKey: 'Create greater value together',
  },
  {
    icon: Boxes,
    titleKey: 'Open ecosystem',
    subtitleKey: 'Connect more possibilities',
  },
]

function AuthModelMarks() {
  return (
    <div
      aria-hidden
      data-slot='auth-model-marks'
      className='absolute right-[-1.5rem] bottom-[9.6rem] h-[20rem] w-[21rem] [perspective:900px]'
    >
      <div className='absolute top-[6.4rem] left-[2rem] h-32 w-64 rotate-[-8deg] rounded-full bg-[#6fb8a4]/18 blur-2xl' />
      <div className='absolute top-[13rem] left-[-2rem] h-[4.5rem] w-[17rem] -rotate-[13deg] bg-[linear-gradient(90deg,transparent,rgba(71,124,108,0.16),transparent)] blur-xl' />
      <div className='absolute top-[5.8rem] left-[1.2rem] h-[8.5rem] w-[5.8rem] -skew-y-[15deg] overflow-hidden rounded-[1.2rem] border border-white/95 bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.2)_48%,rgba(146,190,178,0.28)_100%)] shadow-[-22px_26px_42px_rgba(53,95,84,0.16),inset_1px_1px_0_rgba(255,255,255,0.98),inset_-1px_-1px_0_rgba(91,145,130,0.16)] backdrop-blur-[16px] backdrop-saturate-150'>
        <span className='absolute inset-x-2 top-1 h-10 rounded-full bg-white/45 blur-md' />
      </div>
      <div className='absolute top-[7.2rem] left-[5.3rem] h-[7.7rem] w-[5.4rem] -skew-y-[15deg] overflow-hidden rounded-[1.15rem] border border-[#B9F8E6]/90 bg-[linear-gradient(135deg,rgba(221,255,246,0.72)_0%,rgba(89,230,189,0.68)_50%,rgba(20,151,112,0.76)_100%)] shadow-[-14px_25px_40px_rgba(28,154,116,0.3),inset_1px_1px_0_rgba(255,255,255,0.8),inset_-1px_-1px_0_rgba(12,111,83,0.24)] backdrop-blur-[14px] backdrop-saturate-150'>
        <span className='absolute -top-3 -left-2 h-20 w-16 rotate-[18deg] bg-white/32 blur-lg' />
      </div>
      <div className='absolute top-[4.8rem] left-[8.5rem] h-[9.4rem] w-[6.1rem] -skew-y-[15deg] overflow-hidden rounded-[1.25rem] border border-[#DDF6EE]/95 bg-[linear-gradient(135deg,rgba(245,255,252,0.58)_0%,rgba(100,173,153,0.5)_42%,rgba(8,103,74,0.86)_100%)] shadow-[2px_30px_46px_rgba(18,92,69,0.32),inset_1px_1px_0_rgba(255,255,255,0.9),inset_-1px_-1px_0_rgba(7,80,59,0.28)] backdrop-blur-[16px] backdrop-saturate-150'>
        <span className='absolute -top-4 left-0 h-24 w-14 rotate-[20deg] bg-white/38 blur-xl' />
      </div>
      <div className='absolute top-[8.4rem] left-[12rem] h-[9.6rem] w-[6.8rem] -skew-y-[15deg] overflow-hidden rounded-[1.25rem] border border-white/95 bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(220,239,234,0.34)_44%,rgba(101,161,145,0.56)_100%)] shadow-[12px_30px_48px_rgba(39,86,74,0.28),inset_1px_1px_0_rgba(255,255,255,1),inset_-1px_-1px_0_rgba(52,113,96,0.22)] backdrop-blur-[18px] backdrop-saturate-150'>
        <span className='absolute -top-5 -left-1 h-28 w-16 rotate-[18deg] bg-white/45 blur-xl' />
      </div>
      <div className='absolute right-[0.8rem] bottom-[0.9rem] h-14 w-[18rem] rotate-[-10deg] rounded-full bg-[#315f53]/22 blur-2xl' />
    </div>
  )
}

export function AuthHeroPanel(props: AuthHeroPanelProps) {
  const { t } = useTranslation()

  return (
    <div
      data-slot='auth-hero-panel'
      className='relative flex h-full min-h-[750px] flex-col overflow-hidden rounded-[24px] border border-white/90 bg-[linear-gradient(155deg,rgba(255,255,255,0.72)_0%,rgba(231,243,239,0.82)_48%,rgba(247,250,249,0.8)_100%)] p-[3.25rem] shadow-[inset_-1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-xl'
    >
      <div aria-hidden className='absolute inset-0'>
        <div className='absolute -top-32 -right-28 h-80 w-80 rounded-full border-[70px] border-white/25' />
        <div className='absolute top-14 -left-28 h-72 w-[34rem] rotate-[18deg] rounded-[50%] border-[54px] border-white/28' />
        <div className='absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-white/38 blur-sm' />
        <div className='absolute top-[44%] right-[-20%] h-60 w-60 rounded-full bg-[#b9e3d8]/24 blur-3xl' />
      </div>

      <div className='relative flex flex-1 flex-col'>
        <div
          data-slot='auth-hero-copy'
          className='relative mt-[5.75rem] space-y-4'
        >
          <p className='text-[1.9rem] leading-none font-semibold tracking-tight text-[#111827]'>
            {props.systemName}
          </p>
          <h2 className='text-[1.75rem] leading-tight font-semibold tracking-tight text-[#111827]'>
            {t('Make leading AI within reach')}
          </h2>
          <p className='max-w-[22rem] pt-2 text-sm leading-6 text-[#596965]'>
            {t(
              'Bring together advanced AI to help individuals and teams work more efficiently and intelligently.'
            )}
          </p>
        </div>

        <AuthModelMarks />

        <div className='relative mt-auto grid grid-cols-3 gap-4'>
          {HERO_STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.titleKey}
                className='flex flex-col items-start gap-1.5'
              >
                <span
                  data-slot='auth-feature-icon'
                  className='mb-1 flex size-11 items-center justify-center rounded-full bg-[#E5F3EE] text-[#0E5546] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                >
                  <Icon
                    className='size-[1.15rem]'
                    strokeWidth={2}
                    aria-hidden='true'
                  />
                </span>
                <p className='text-sm font-semibold text-[#18201E]'>
                  {t(stat.titleKey)}
                </p>
                <p className='text-xs leading-4 text-[#66736F]'>
                  {t(stat.subtitleKey)}
                </p>
              </div>
            )
          })}
        </div>

        <p className='relative mt-7 flex items-center gap-3 text-xs text-[#8B9693]'>
          <span className='h-px w-12 bg-[#B8C8C3]' />
          {t('AI, creating a better future')}
        </p>
      </div>
    </div>
  )
}
