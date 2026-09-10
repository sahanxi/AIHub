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
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthHeroPanel } from '../components/auth-hero-panel'

afterEach(cleanup)

describe('authentication brand panel layout', () => {
  it('keeps the desktop glass panel treatment and filled feature marks', () => {
    const { container } = render(<AuthHeroPanel systemName='AIHub' />)

    const panel = container.querySelector('[data-slot="auth-hero-panel"]')
    expect(panel).toHaveClass('min-h-[750px]', 'backdrop-blur-xl')
    expect(screen.getByText('AIHub')).toBeVisible()

    const heroCopy = container.querySelector('[data-slot="auth-hero-copy"]')
    expect(heroCopy).toHaveClass('mt-[5.75rem]')

    const modelMarks = container.querySelector('[data-slot="auth-model-marks"]')
    expect(modelMarks).toHaveClass('bottom-[9.6rem]')
    expect(modelMarks?.querySelectorAll('.backdrop-saturate-150')).toHaveLength(
      4
    )

    const featureMarks = container.querySelectorAll(
      '[data-slot="auth-feature-icon"]'
    )
    expect(featureMarks).toHaveLength(3)
    for (const featureMark of featureMarks) {
      expect(featureMark).toHaveClass('bg-[#E5F3EE]')
    }
  })
})
