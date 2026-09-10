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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  IconDiscord,
  IconGithub,
  IconLinuxDo,
  IconTelegram,
  IconWeChat,
} from '@/assets/brand-icons'
import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { useOAuthLogin } from '../hooks/use-oauth-login'
import { findGoogleCustomOAuthProvider } from '../lib/oauth'
import type { SystemStatus } from '../types'
import { AUTH_OAUTH_CLASS, AuthOrDivider } from './auth-field'

type OAuthProvidersProps = {
  status: SystemStatus | null
  disabled?: boolean
  className?: string
  onWeChatLogin?: () => void
  isWeChatLoading?: boolean
  redirectTo?: string
  showDivider?: boolean
  dividerPlacement?: 'before' | 'after'
  dividerLabel?: string
}

type ProviderButton = {
  key: string
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
}

export function OAuthProviders({
  status,
  disabled = false,
  className,
  onWeChatLogin,
  isWeChatLoading = false,
  redirectTo,
  showDivider = true,
  dividerPlacement = 'before',
  dividerLabel,
}: OAuthProvidersProps) {
  const { t } = useTranslation()
  const {
    isLoading,
    githubButtonText,
    githubButtonDisabled,
    handleGitHubLogin,
    handleDiscordLogin,
    handleOIDCLogin,
    handleLinuxDOLogin,
    handleTelegramLogin,
    handleCustomOAuthLogin,
  } = useOAuthLogin(status, redirectTo)

  const providerButtons: ProviderButton[] = []

  if (status?.wechat_login && onWeChatLogin) {
    providerButtons.push({
      key: 'wechat',
      label: t('Continue with WeChat'),
      onClick: onWeChatLogin,
      icon: <IconWeChat className='h-4 w-4' />,
      disabled: isWeChatLoading,
    })
  }

  if (status?.github_oauth) {
    providerButtons.push({
      key: 'github',
      label: githubButtonText || t('Continue with GitHub'),
      onClick: handleGitHubLogin,
      icon: <IconGithub className='h-4 w-4' />,
      disabled: githubButtonDisabled,
    })
  }

  if (status?.discord_oauth) {
    providerButtons.push({
      key: 'discord',
      label: t('Continue with Discord'),
      onClick: handleDiscordLogin,
      icon: <IconDiscord className='h-4 w-4' />,
    })
  }

  if (status?.oidc_enabled) {
    const oidcDisplayName = status.oidc_display_name?.trim() || 'OIDC'
    providerButtons.push({
      key: 'oidc',
      label: t('Continue with {{name}}', {
        name: oidcDisplayName,
      }),
      onClick: handleOIDCLogin,
    })
  }

  if (status?.linuxdo_oauth) {
    providerButtons.push({
      key: 'linuxdo',
      label: t('Continue with LinuxDO'),
      onClick: handleLinuxDOLogin,
      icon: <IconLinuxDo className='h-4 w-4' />,
    })
  }

  if (status?.telegram_oauth) {
    providerButtons.push({
      key: 'telegram',
      label: t('Continue with Telegram'),
      onClick: handleTelegramLogin,
      icon: <IconTelegram data-icon='inline-start' />,
    })
  }

  const customProviders = status?.custom_oauth_providers
  const googleProvider = findGoogleCustomOAuthProvider(status)
  if (customProviders && customProviders.length > 0) {
    for (const provider of customProviders) {
      const isGoogle = googleProvider?.slug === provider.slug
      let icon = provider.icon ? getLobeIcon(provider.icon, 16) : undefined
      let label = t('Continue with {{name}}', { name: provider.name })
      if (isGoogle) {
        icon = getLobeIcon('Google.Color', 18)
        label = t('Sign in with Google')
      }
      providerButtons.push({
        key: `custom-${provider.slug}`,
        label,
        onClick: () => handleCustomOAuthLogin(provider),
        icon,
      })
    }
  }

  if (providerButtons.length === 0) return null

  const buttons = (
    <div className='flex flex-col gap-2'>
      {providerButtons.map(
        ({ key, label, onClick, icon, disabled: extraDisabled }) => (
          <Button
            key={key}
            variant='outline'
            type='button'
            disabled={disabled || isLoading || extraDisabled}
            onClick={onClick}
            className={AUTH_OAUTH_CLASS}
          >
            {icon}
            {label}
          </Button>
        )
      )}
    </div>
  )

  return (
    <div className={cn('space-y-3', className)}>
      {showDivider && dividerPlacement === 'before' ? (
        <AuthOrDivider label={dividerLabel} />
      ) : null}
      {buttons}
      {showDivider && dividerPlacement === 'after' ? (
        <AuthOrDivider label={dividerLabel} />
      ) : null}
    </div>
  )
}
