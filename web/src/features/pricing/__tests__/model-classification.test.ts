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

import { ENDPOINT_TYPES } from '../constants'
import {
  MODEL_CLASSIFICATIONS,
  getModelClassification,
} from '../lib/model-classification'
import type { PricingModel } from '../types'

function model(partial: Partial<PricingModel>): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...partial,
  }
}

describe('model classification', () => {
  it('classifies GPT-5.x and Grok as omnimodal', () => {
    expect(
      getModelClassification(model({ model_name: 'GPT-5.6 Sol' }))
    ).toBe(MODEL_CLASSIFICATIONS.OMNIMODAL)
    expect(
      getModelClassification(model({ model_name: 'Grok 4.6' }))
    ).toBe(MODEL_CLASSIFICATIONS.OMNIMODAL)
  })

  it('classifies Nano Banana Pro as vision', () => {
    expect(
      getModelClassification(
        model({
          model_name: 'Nano Banana Pro',
          supported_endpoint_types: [ENDPOINT_TYPES.GEMINI, ENDPOINT_TYPES.OPENAI],
        })
      )
    ).toBe(MODEL_CLASSIFICATIONS.VISION)
  })

  it('classifies Devstral as text and Magistral as omnimodal', () => {
    expect(
      getModelClassification(model({ model_name: 'Devstral 2' }))
    ).toBe(MODEL_CLASSIFICATIONS.TEXT)
    expect(
      getModelClassification(model({ model_name: 'Magistral small' }))
    ).toBe(MODEL_CLASSIFICATIONS.OMNIMODAL)
  })
})
