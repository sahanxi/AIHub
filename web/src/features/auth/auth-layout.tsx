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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

import { AUTH_PRIVACY_HREF, AUTH_TERMS_HREF } from './components/auth-field'
import { AuthHeroPanel } from './components/auth-hero-panel'

type AuthLayoutProps = {
  children: React.ReactNode
}

function AuthPageAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0'
        style={{
          backgroundImage:
            'radial-gradient(circle at 19% 18%, rgba(214,235,229,0.48), transparent 30%), radial-gradient(circle at 82% 10%, rgba(226,238,235,0.55), transparent 28%), linear-gradient(135deg, #fbfcfc 0%, #f8fbfa 52%, #ffffff 100%)',
        }}
      />
      <svg
        aria-hidden
        className='pointer-events-none absolute inset-0 h-full w-full text-[#69998d]/[0.09]'
        viewBox='0 0 1440 900'
        fill='none'
        preserveAspectRatio='xMidYMid slice'
      >
        <path
          d='M-170 705C60 445 222 458 405 604C566 732 677 823 846 875'
          stroke='currentColor'
          strokeWidth='150'
        />
        <path
          d='M-110 810C125 548 285 590 440 716C558 812 641 866 744 910'
          stroke='currentColor'
          strokeWidth='78'
        />
        <path
          d='M1040 -120C1068 77 1185 180 1468 219'
          stroke='currentColor'
          strokeWidth='120'
        />
      </svg>
      <div
        aria-hidden
        className='pointer-events-none absolute top-[22%] right-[-10%] h-[38rem] w-[38rem] rounded-full bg-white/70 blur-3xl'
      />
    </>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const year = new Date().getFullYear()

  return (
    <div
      className='relative flex min-h-svh flex-col overflow-x-hidden bg-[#F8FBFA] text-[#111827]'
      style={{
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,"PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      <AuthPageAtmosphere />

      <header className='relative z-10 flex h-24 items-center justify-between px-6 md:px-12 lg:px-[4.5rem]'>
        <Link
          to='/'
          className='flex items-center gap-2 transition-opacity hover:opacity-80'
        >
          <div className='relative size-10'>
            {loading ? (
              <Skeleton className='absolute inset-0 rounded-lg' />
            ) : (
              <img
                src={logo}
                alt={t('Logo')}
                className='size-10 rounded-xl object-contain'
              />
            )}
          </div>
          {loading ? (
            <Skeleton className='h-5 w-20' />
          ) : (
            <h1 className='text-2xl font-semibold tracking-tight'>
              {systemName}
            </h1>
          )}
        </Link>
        <p className='hidden items-center gap-4 text-sm text-[#7F8C89] sm:flex'>
          <span className='h-px w-12 bg-[#C9D6D2]' />
          {t('Changing how everyone works with AI')}
        </p>
      </header>

      <main className='relative z-10 flex flex-1 items-center justify-center px-4 pb-5 md:px-8'>
        <div className='grid w-full max-w-[1120px] overflow-hidden rounded-[24px] border border-white/80 bg-white/88 shadow-[0_24px_80px_rgba(38,76,67,0.12)] backdrop-blur-xl md:min-h-[750px] md:grid-cols-[minmax(0,46%)_minmax(0,54%)]'>
          <div className='hidden h-full md:block'>
            <AuthHeroPanel systemName={systemName} />
          </div>
          <section className='flex w-full justify-center px-6 py-10 md:px-12 md:py-16 lg:px-[4.25rem]'>
            <div className='w-full max-w-[460px]'>{children}</div>
          </section>
        </div>
      </main>

      <footer className='relative z-10 flex min-h-16 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-center text-[12px] text-[#8B9693]'>
        <span>
          {t('© {{year}} {{name}}. All rights reserved.', {
            year,
            name: systemName,
          })}
        </span>
        <span aria-hidden='true'>|</span>
        <a
          href={AUTH_PRIVACY_HREF}
          target='_blank'
          rel='noopener noreferrer'
          className='transition-colors hover:text-[#667085]'
        >
          {t('Privacy Policy')}
        </a>
        <span aria-hidden='true'>|</span>
        <a
          href={AUTH_TERMS_HREF}
          target='_blank'
          rel='noopener noreferrer'
          className='transition-colors hover:text-[#667085]'
        >
          {t('Terms of Service')}
        </a>
      </footer>
    </div>
  )
}
