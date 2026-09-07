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
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SystemBrand } from '../system-brand'

let client: QueryClient

beforeEach(() => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/status') {
      return {
        data: {
          data: {
            system_name: DEFAULT_SYSTEM_NAME,
            logo: '',
            setup: true,
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
})

async function renderInlineBrand() {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <SystemBrand variant='inline' />,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('SystemBrand public header', () => {
  it('renders the inline home brand after setup without throwing', async () => {
    await renderInlineBrand()

    const homeLink = await screen.findByRole('link', { name: 'Go to home' })
    expect(homeLink).toHaveAttribute('href', '/')
    expect(homeLink).toHaveTextContent(DEFAULT_SYSTEM_NAME)
  })
})
