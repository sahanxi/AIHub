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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { ApiExample } from '../sections/api-example'
import { Hero } from '../sections/hero'
import { Stats } from '../sections/stats'

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
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/status') {
      return {
        data: {
          data: {
            custom_oauth_providers: [googleProvider],
          },
        },
      }
    }
    throw new Error(`Unexpected request: ${url}`)
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function renderHero(isAuthenticated = false) {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <QueryClientProvider client={client}>
          <Hero isAuthenticated={isAuthenticated} />
        </QueryClientProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}

describe('homepage hero', () => {
  it('keeps subtitle copy in one block with consistent leading', async () => {
    await renderHero()

    const intro = screen.getByText(
      /Call leading AI models through one API, including/
    )
    expect(intro).toHaveClass('leading-[1.8]')
    expect(intro.textContent).toMatch(/Official source, global nodes/)
    expect(intro.textContent).not.toMatch(/Continuing to expand/)
  })

  it('uses the same capsule style for vendors and the expand label', async () => {
    await renderHero()

    const supportedLabel = screen.getByText('Supported Models')
    const row = supportedLabel
      .closest('div')
      ?.parentElement?.querySelector('.flex.flex-wrap')
    expect(row).toBeInstanceOf(HTMLElement)

    const capsules = [...(row?.children ?? [])]
    expect(capsules.at(-2)?.textContent).toMatch(/Grok/)
    expect(capsules.at(-1)?.textContent).toBe('Continuing to expand...')

    const vendorClass = capsules[0]?.className ?? ''
    const expandClass = capsules.at(-1)?.className ?? ''
    expect(expandClass).toBe(vendorClass)
  })

  it('only shows Get Started and Docs for guests', async () => {
    await renderHero()

    expect(screen.getByText('Get Started')).toBeVisible()
    expect(screen.getAllByText('Docs').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /Sign in with Google/i })
    ).not.toBeInTheDocument()
    expect(screen.queryByText('View Pricing')).not.toBeInTheDocument()
  })
})

describe('homepage API example card', () => {
  it('keeps code inset from the card edges like the hero terminal', () => {
    render(<ApiExample />)

    const tabBar = screen.getByText('cURL').closest('.flex')
    expect(tabBar).toHaveClass('px-5', 'py-3')

    const codeBody = tabBar?.nextElementSibling
    expect(codeBody).toHaveClass('px-5', 'py-4')
  })

  it('colors sample tokens like the hero terminal', () => {
    render(<ApiExample />)

    expect(screen.getByText('curl')).toHaveClass('text-emerald-600')
    expect(screen.getAllByText('-H').length).toBeGreaterThan(0)
    expect(screen.getAllByText('-H')[0]).toHaveClass('text-blue-600')
  })

  it('auto-plays from cURL to Python', () => {
    // The suite defaults to reduced motion, which intentionally disables
    // auto-play. Opt back in so this test exercises the animated path.
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) => ({ ...matchMedia(query), matches: false }) as MediaQueryList
    )
    vi.useFakeTimers()
    render(<ApiExample />)

    expect(screen.getByText('curl')).toBeVisible()

    act(() => {
      vi.advanceTimersByTime(4720)
    })

    expect(screen.getByText('from')).toBeVisible()
    expect(screen.queryByText('curl')).not.toBeInTheDocument()
  })
})

describe('homepage supported model capsules', () => {
  it('makes model capsules larger and leaves the expand capsule without a fill', () => {
    render(<Stats />)

    expect(screen.getByText('GPT-6 Astra')).toHaveClass(
      'px-3.5',
      'py-1.5',
      'text-sm'
    )

    const expand = screen.getByText('Continuing to expand...')
    expect(expand).toHaveClass('bg-transparent', 'px-3.5', 'py-1.5', 'text-sm')
    expect(expand.className).not.toMatch(/bg-muted/)
    expect(expand.className).not.toMatch(/bg-background/)
  })
})
