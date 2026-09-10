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

import { AuthLayout } from '../auth-layout'
import { AUTH_LINK_CLASS } from '../components/auth-field'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()

  return (
    <AuthLayout>
      <div className='w-full space-y-8'>
        <div className='space-y-2'>
          <h2 className='text-[36px] leading-tight font-semibold tracking-[-0.03em] text-[#111827]'>
            {t('Create an account')}
          </h2>
          <p className='text-sm text-[#667085]'>
            {t('Already have an account?')}{' '}
            <Link to='/sign-in' className={AUTH_LINK_CLASS}>
              {t('Sign in')}
            </Link>
          </p>
        </div>

        <SignUpForm />
      </div>
    </AuthLayout>
  )
}
