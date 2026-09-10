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
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import axios from 'axios'
import { ArrowRight, KeyRound, Loader2, Lock, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { PasswordInput } from '@/components/password-input'
import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, wechatLoginByCode } from '@/features/auth/api'
import {
  AUTH_INPUT_CLASS,
  AUTH_OAUTH_CLASS,
  AUTH_PRIVACY_HREF,
  AUTH_SOFT_LINK_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_TERMS_HREF,
  AuthLeadingField,
  AuthOrDivider,
} from '@/features/auth/components/auth-field'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { loginFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import { beginPasskeyLogin, finishPasskeyLogin } from '@/features/auth/passkey'
import type { AuthFormProps } from '@/features/auth/types'
import { useStatus } from '@/hooks/use-status'
import {
  buildAssertionResult,
  prepareCredentialRequestOptions,
  isPasskeySupported as detectPasskeySupport,
} from '@/lib/passkey'
import { getServerErrorMessageKey } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: AuthFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [wechatCode, setWeChatCode] = useState('')
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')
  const loginFailedMessage = t('Login failed')

  const { status } = useStatus()
  const passkeyLoginEnabled = Boolean(
    status?.passkey_login ?? status?.data?.passkey_login
  )
  const passwordLoginEnabled =
    (status?.password_login_enabled ??
      status?.data?.password_login_enabled ??
      true) !== false
  const passwordLoginEncryptionEnabled =
    (status?.password_login_encryption_enabled ??
      status?.data?.password_login_encryption_enabled ??
      false) === true
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const { handleLoginResult } = useAuthRedirect()

  const requiresLegalConsent = true
  const passkeyButtonDisabled =
    isPasskeyLoading ||
    !passkeySupported ||
    (requiresLegalConsent && !agreedToLegal)
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const hasOAuthLogin = Boolean(
    status?.github_oauth ||
    status?.discord_oauth ||
    status?.oidc_enabled ||
    status?.linuxdo_oauth ||
    status?.telegram_oauth ||
    (status?.custom_oauth_providers?.length ?? 0) > 0
  )
  const hasAlternativeLogin =
    passkeyLoginEnabled || hasWeChatLogin || hasOAuthLogin

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    detectPasskeySupport()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false))
  }, [])

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const wechatQrCodeUrl = useMemo(() => {
    return (
      status?.wechat_qrcode ||
      status?.wechat_qr_code ||
      status?.wechat_qrcode_image_url ||
      status?.wechat_qr_code_image_url ||
      status?.wechat_account_qrcode_image_url ||
      status?.WeChatAccountQRCodeImageURL ||
      status?.data?.wechat_qrcode ||
      status?.data?.WeChatAccountQRCodeImageURL ||
      ''
    )
  }, [status])

  async function onSubmit(data: z.infer<typeof loginFormSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    if (!validateTurnstile()) return

    const submittedTurnstileToken = turnstileToken
    if (isTurnstileEnabled) {
      setTurnstileToken('')
      setTurnstileWidgetKey((current) => current + 1)
    }

    setIsLoading(true)
    try {
      const res = await login({
        username: data.username,
        password: data.password,
        turnstile: submittedTurnstileToken,
        passwordEncryptionEnabled: passwordLoginEncryptionEnabled,
      })

      if (res.success) {
        form.setValue('password', '')
        if (await handleLoginResult(res.data, redirectTo)) {
          toast.success(t('Welcome back!'))
        }
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) return
      toast.error(error instanceof Error ? error.message : loginFailedMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenWeChatDialog = () => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    setIsWeChatDialogOpen(true)
  }

  const handleWeChatDialogChange = (open: boolean) => {
    setIsWeChatDialogOpen(open)
    if (!open) {
      setWeChatCode('')
      setIsWeChatSubmitting(false)
    }
  }

  async function handleWeChatLogin() {
    if (!wechatCode.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(wechatCode)
      if (res?.success) {
        handleWeChatDialogChange(false)
        if (await handleLoginResult(res.data, redirectTo)) {
          toast.success(t('Signed in via WeChat'))
        }
      } else {
        if (getServerErrorMessageKey(res)) return
        toast.error(res?.message || loginFailedMessage)
      }
    } catch (error: unknown) {
      if (getServerErrorMessageKey(error)) return
      toast.error(loginFailedMessage)
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  async function handlePasskeyLogin() {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    if (!passkeySupported) {
      toast.error(t('Passkey is not supported on this device'))
      return
    }

    if (!navigator?.credentials) {
      toast.error(t('Passkey is not available in this browser'))
      return
    }

    setIsPasskeyLoading(true)
    try {
      const begin = await beginPasskeyLogin()
      if (!begin.success) {
        if (getServerErrorMessageKey(begin)) return
        throw new Error(begin.message || t('Failed to start Passkey login'))
      }

      const publicKey = prepareCredentialRequestOptions(
        begin.data?.options ?? begin.data
      )
      const flowToken = begin.data?.flow_token
      if (!flowToken) {
        throw new Error(t('Login flow expired. Please sign in again.'))
      }

      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null

      if (!credential) {
        toast.info(t('Passkey login was cancelled'))
        return
      }

      const assertion = buildAssertionResult(credential)
      if (!assertion) {
        throw new Error(t('Invalid Passkey response'))
      }

      const finish = await finishPasskeyLogin(flowToken, assertion)
      if (!finish.success) {
        if (getServerErrorMessageKey(finish)) return
        throw new Error(finish.message || t('Failed to complete Passkey login'))
      }

      if (await handleLoginResult(finish.data, redirectTo)) {
        toast.success(t('Signed in with Passkey'))
      }
    } catch (error: unknown) {
      if (getServerErrorMessageKey(error)) return
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.info(t('Passkey login was cancelled or timed out'))
      } else if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('Passkey login failed'))
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  const alternativeLoginMethods = (
    <>
      <OAuthProviders
        status={status}
        redirectTo={redirectTo}
        disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
        onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
        isWeChatLoading={isWeChatSubmitting}
        showDivider={false}
      />

      {passkeyLoginEnabled && (
        <div className='space-y-1'>
          <Button
            type='button'
            variant='outline'
            disabled={passkeyButtonDisabled}
            onClick={handlePasskeyLogin}
            className={AUTH_OAUTH_CLASS}
          >
            {isPasskeyLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <KeyRound className='h-4 w-4' />
            )}
            {t('Sign in with Passkey')}
          </Button>
          {!passkeySupported && (
            <p className='text-muted-foreground text-xs'>
              {t('Passkey is not supported on this device.')}
            </p>
          )}
        </div>
      )}
    </>
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          'grid gap-4 [&_[data-slot=form-message]]:text-[#D92D20]',
          className
        )}
        {...props}
      >
        {hasAlternativeLogin && alternativeLoginMethods}
        {hasAlternativeLogin && passwordLoginEnabled ? (
          <AuthOrDivider label={t('Or sign in with an account')} />
        ) : null}

        {passwordLoginEnabled && (
          <>
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Username or Email')}</FormLabel>
                  <FormControl>
                    <AuthLeadingField icon={User}>
                      <Input
                        placeholder={t('Enter your username or email')}
                        {...field}
                        className={AUTH_INPUT_CLASS}
                      />
                    </AuthLeadingField>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem className='relative'>
                  <FormLabel>{t('Password')}</FormLabel>
                  <FormControl>
                    <AuthLeadingField icon={Lock}>
                      <PasswordInput
                        placeholder={t('Enter password')}
                        {...field}
                        className={AUTH_INPUT_CLASS}
                      />
                    </AuthLeadingField>
                  </FormControl>
                  <FormMessage />
                  <Link
                    to='/forgot-password'
                    className={cn(
                      AUTH_SOFT_LINK_CLASS,
                      'absolute end-0 -top-0.5 z-10'
                    )}
                  >
                    {t('Forgot password?')}
                  </Link>
                </FormItem>
              )}
            />

            <Button
              type='submit'
              className={AUTH_SUBMIT_CLASS}
              disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
            >
              {t('Sign in')}
              {isLoading ? (
                <Loader2 className='animate-spin' />
              ) : (
                <ArrowRight />
              )}
            </Button>

            {/* Turnstile */}
            {isTurnstileEnabled && (
              <div>
                <Turnstile
                  key={turnstileWidgetKey}
                  siteKey={turnstileSiteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                />
              </div>
            )}
          </>
        )}

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          alwaysShow
          termsHref={AUTH_TERMS_HREF}
          privacyHref={AUTH_PRIVACY_HREF}
          variant='plain'
        />

        {!hasAlternativeLogin && alternativeLoginMethods}
      </form>

      {hasWeChatLogin && (
        <Dialog
          open={isWeChatDialogOpen}
          onOpenChange={handleWeChatDialogChange}
          title={t('WeChat sign in')}
          description={t(
            'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
          )}
          contentClassName='max-w-sm'
          headerClassName='text-left'
          contentHeight='auto'
          bodyClassName='space-y-4'
          footer={
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleWeChatDialogChange(false)}
                disabled={isWeChatSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleWeChatLogin}
                disabled={
                  isWeChatSubmitting ||
                  !wechatCode.trim() ||
                  (requiresLegalConsent && !agreedToLegal)
                }
                className='gap-2'
              >
                {isWeChatSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {t('Confirm')}
              </Button>
            </>
          }
        >
          {wechatQrCodeUrl ? (
            <div className='flex justify-center'>
              <img
                src={wechatQrCodeUrl}
                alt={t('WeChat login QR code')}
                className='h-40 w-40 rounded-md border object-contain'
              />
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('QR code is not configured. Please contact support.')}
            </p>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
            <Input
              id='wechat-code'
              placeholder={t('Enter the verification code')}
              value={wechatCode}
              onChange={(event) => setWeChatCode(event.target.value)}
              autoComplete='one-time-code'
            />
          </div>
        </Dialog>
      )}
    </Form>
  )
}
