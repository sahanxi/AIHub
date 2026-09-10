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
import { describe, expect, it } from 'vitest'

import type { CustomOAuthProviderInfo, SystemStatus } from '../../types'
import { findGoogleCustomOAuthProvider, hasOAuthProviders } from '../oauth'

const googleProvider: CustomOAuthProviderInfo = {
  id: 1,
  name: 'Google',
  slug: 'google',
  icon: 'Google.Color',
  client_id: 'test-google-client',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  scopes: 'openid email profile',
}

function statusWithProviders(
  providers: CustomOAuthProviderInfo[]
): SystemStatus {
  return { custom_oauth_providers: providers }
}

describe('findGoogleCustomOAuthProvider', () => {
  it('returns the custom Google provider when slug is google', () => {
    expect(
      findGoogleCustomOAuthProvider(statusWithProviders([googleProvider]))
    ).toEqual(googleProvider)
  })

  it('matches Google by display name when slug is different', () => {
    const provider = { ...googleProvider, slug: 'workspace', name: 'Google' }
    expect(findGoogleCustomOAuthProvider(statusWithProviders([provider]))).toBe(
      provider
    )
  })

  it('matches Google by lobe icon key', () => {
    const provider = {
      ...googleProvider,
      slug: 'workspace-sso',
      name: 'Company SSO',
      icon: 'Google.Color',
    }
    expect(findGoogleCustomOAuthProvider(statusWithProviders([provider]))).toBe(
      provider
    )
  })

  it('returns undefined when Google is not configured', () => {
    expect(findGoogleCustomOAuthProvider(null)).toBeUndefined()
    expect(findGoogleCustomOAuthProvider({})).toBeUndefined()
    expect(
      findGoogleCustomOAuthProvider(
        statusWithProviders([
          { ...googleProvider, slug: 'gitlab', name: 'GitLab', icon: 'gitlab' },
        ])
      )
    ).toBeUndefined()
  })
})

describe('hasOAuthProviders', () => {
  it('treats enabled custom OAuth providers as available login options', () => {
    expect(hasOAuthProviders(null)).toBe(false)
    expect(hasOAuthProviders({})).toBe(false)
    expect(hasOAuthProviders(statusWithProviders([googleProvider]))).toBe(true)
  })
})
