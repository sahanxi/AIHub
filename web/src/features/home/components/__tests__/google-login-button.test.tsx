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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { HomeGoogleLoginButton } from '../google-login-button'

const googleProvider = {
  id: 1,
  name: 'Google',
  slug: 'google',
  icon: 'Google.Color',
  client_id: 'test-google-client',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  scopes: 'openid email profile',
}

let client: QueryClient

beforeEach(() => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  window.localStorage.removeItem('status')
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  vi.restoreAllMocks()
})

async function renderButton(providers: (typeof googleProvider)[] = []) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/status') {
      return {
        data: {
          data: {
            custom_oauth_providers: providers,
          },
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })

  render(
    <QueryClientProvider client={client}>
      <HomeGoogleLoginButton />
    </QueryClientProvider>
  )
}

describe('HomeGoogleLoginButton', () => {
  it('shows Sign in with Google when a Google custom OAuth provider is enabled', async () => {
    await renderButton([googleProvider])

    expect(
      await screen.findByRole('button', { name: /Sign in with Google/i })
    ).toBeVisible()
  })

  it('does not render a Google login button when Google OAuth is not configured', async () => {
    await renderButton([])

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled()
    })

    expect(
      screen.queryByRole('button', { name: /Sign in with Google/i })
    ).not.toBeInTheDocument()
  })
})
