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

import { Button } from '@/components/ui/button'
import { useOAuthLogin } from '@/features/auth/hooks/use-oauth-login'
import { findGoogleCustomOAuthProvider } from '@/features/auth/lib/oauth'
import { useStatus } from '@/hooks/use-status'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

type HomeGoogleLoginButtonProps = {
  className?: string
  redirectTo?: string
}

export function HomeGoogleLoginButton(props: HomeGoogleLoginButtonProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const googleProvider = findGoogleCustomOAuthProvider(status)
  const { isLoading, handleCustomOAuthLogin } = useOAuthLogin(
    status,
    props.redirectTo
  )

  if (!googleProvider) return null

  return (
    <Button
      type='button'
      variant='outline'
      disabled={isLoading}
      onClick={() => handleCustomOAuthLogin(googleProvider)}
      className={cn(
        'border-border/50 hover:border-border hover:bg-muted/50 inline-flex items-center gap-2 rounded-lg px-5 text-sm font-medium',
        props.className
      )}
    >
      {getLobeIcon('Google.Color', 18)}
      <span>{t('Sign in with Google')}</span>
    </Button>
  )
}
