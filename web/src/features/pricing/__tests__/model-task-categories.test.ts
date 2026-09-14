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
  TASK_CATEGORIES,
  getModelTaskCategory,
} from '../lib/model-task-categories'
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

describe('model task categories', () => {
  it('classifies embedding models as vector', () => {
    expect(
      getModelTaskCategory(
        model({
          model_name: 'text-embedding-3-large',
          supported_endpoint_types: [ENDPOINT_TYPES.EMBEDDINGS],
        })
      )
    ).toBe(TASK_CATEGORIES.VECTOR)
  })

  it('classifies chat models as text and code by default', () => {
    expect(
      getModelTaskCategory(
        model({
          model_name: 'gpt-4.1-mini',
          supported_endpoint_types: [ENDPOINT_TYPES.OPENAI],
        })
      )
    ).toBe(TASK_CATEGORIES.TEXT_CODE)
  })

  it('classifies vision-capable models as multimodal', () => {
    expect(
      getModelTaskCategory(
        model({
          model_name: 'gpt-4o',
          supported_endpoint_types: [ENDPOINT_TYPES.OPENAI],
        })
      )
    ).toBe(TASK_CATEGORIES.MULTIMODAL)
  })
})
