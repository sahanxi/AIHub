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
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DocsDesktopSidebar } from '../components/docs-sidebar'

describe('DocsDesktopSidebar', () => {
  it('starts with every directory group expanded and toggles them independently', () => {
    render(<DocsDesktopSidebar />)

    const apiReference = screen.getByRole('button', { name: 'API Reference' })
    const aiModelApis = screen.getByRole('button', { name: 'AI Model APIs' })
    const managementApis = screen.getByRole('button', {
      name: 'Management APIs',
    })

    expect(apiReference).toHaveAttribute('aria-expanded', 'true')
    expect(aiModelApis).toHaveAttribute('aria-expanded', 'true')
    expect(managementApis).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Model list' })).toBeVisible()

    fireEvent.click(aiModelApis)

    expect(aiModelApis).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('link', { name: 'Model list' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toBeVisible()

    fireEvent.click(aiModelApis)

    expect(aiModelApis).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Model list' })).toBeVisible()
  })
})
