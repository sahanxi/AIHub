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
import type { TFunction } from 'i18next'

import { ENDPOINT_TYPES, FILTER_ALL } from '../constants'
import type { PricingModel } from '../types'
import { hasTaskUsageSchema } from './dynamic-price'
import { parseTags } from './filters'

export const TASK_CATEGORIES = {
  ALL: FILTER_ALL,
  MULTIMODAL: 'multimodal',
  TEXT_CODE: 'text_code',
  IMAGE: 'image',
  VECTOR: 'vector',
  VIDEO: 'video',
  AUDIO: 'audio',
  GENERATION_TASK: 'generation_task',
} as const

export type TaskCategoryId =
  (typeof TASK_CATEGORIES)[keyof typeof TASK_CATEGORIES]

const TASK_CATEGORY_ORDER: TaskCategoryId[] = [
  TASK_CATEGORIES.MULTIMODAL,
  TASK_CATEGORIES.TEXT_CODE,
  TASK_CATEGORIES.IMAGE,
  TASK_CATEGORIES.VECTOR,
  TASK_CATEGORIES.VIDEO,
  TASK_CATEGORIES.AUDIO,
  TASK_CATEGORIES.GENERATION_TASK,
]

export function getTaskCategoryLabels(
  t: TFunction
): Record<TaskCategoryId, string> {
  return {
    [TASK_CATEGORIES.ALL]: t('All Tasks'),
    [TASK_CATEGORIES.MULTIMODAL]: t('Multimodal'),
    [TASK_CATEGORIES.TEXT_CODE]: t('Text & Code'),
    [TASK_CATEGORIES.IMAGE]: t('Image'),
    [TASK_CATEGORIES.VECTOR]: t('Vectors'),
    [TASK_CATEGORIES.VIDEO]: t('Video'),
    [TASK_CATEGORIES.AUDIO]: t('Audio'),
    [TASK_CATEGORIES.GENERATION_TASK]: t('Generation Tasks'),
  }
}

export function listTaskCategories(): TaskCategoryId[] {
  return TASK_CATEGORY_ORDER
}

function hasEndpoint(model: PricingModel, endpoint: string): boolean {
  return model.supported_endpoint_types?.includes(endpoint) ?? false
}

export function getModelTaskCategory(model: PricingModel): TaskCategoryId {
  const name = model.model_name.toLowerCase()
  const tags = parseTags(model.tags).map((tag) => tag.toLowerCase())

  if (
    hasEndpoint(model, ENDPOINT_TYPES.EMBEDDINGS) ||
    hasEndpoint(model, ENDPOINT_TYPES.JINA_RERANK) ||
    /embed|rerank|bge-|e5-|voyage-/.test(name)
  ) {
    return TASK_CATEGORIES.VECTOR
  }

  if (
    hasEndpoint(model, ENDPOINT_TYPES.OPENAI_VIDEO) ||
    /sora|veo|kling|pika|video|wan-|hunyuanvideo|seedance/.test(name)
  ) {
    return TASK_CATEGORIES.VIDEO
  }

  if (
    hasEndpoint(model, ENDPOINT_TYPES.IMAGE_GENERATION) ||
    /dall-?e|imagen|flux|midjourney|stable-diffusion|ideogram|gpt-image|seedream|recraft/.test(
      name
    )
  ) {
    return TASK_CATEGORIES.IMAGE
  }

  if (/whisper|tts|voice|audio|speech/.test(name)) {
    return TASK_CATEGORIES.AUDIO
  }

  if (hasTaskUsageSchema(model)) {
    return TASK_CATEGORIES.GENERATION_TASK
  }

  if (
    /vision|omni|multimodal|gpt-4o|gpt-4-turbo|claude-3|claude-4|gemini-.*-flash|gemini-.*-pro|qwen-vl|glm-4v|pixtral/.test(
      name
    ) ||
    tags.some((tag) =>
      ['multimodal', 'vision', 'image', 'video', 'audio'].includes(tag)
    ) ||
    (hasEndpoint(model, ENDPOINT_TYPES.OPENAI) &&
      hasEndpoint(model, ENDPOINT_TYPES.IMAGE_GENERATION))
  ) {
    return TASK_CATEGORIES.MULTIMODAL
  }

  return TASK_CATEGORIES.TEXT_CODE
}

export function matchesTaskCategory(
  model: PricingModel,
  category: string
): boolean {
  if (category === TASK_CATEGORIES.ALL) return true
  return getModelTaskCategory(model) === category
}
