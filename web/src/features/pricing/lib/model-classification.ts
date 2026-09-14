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

export const MODEL_CLASSIFICATIONS = {
  ALL: FILTER_ALL,
  OMNIMODAL: 'omnimodal',
  TEXT: 'text',
  VISION: 'vision',
  AUDIO: 'audio',
  VECTOR: 'vector',
  REALTIME: 'realtime',
} as const

export type ModelClassificationId =
  (typeof MODEL_CLASSIFICATIONS)[keyof typeof MODEL_CLASSIFICATIONS]

const CLASSIFICATION_ORDER: ModelClassificationId[] = [
  MODEL_CLASSIFICATIONS.OMNIMODAL,
  MODEL_CLASSIFICATIONS.TEXT,
  MODEL_CLASSIFICATIONS.VISION,
  MODEL_CLASSIFICATIONS.AUDIO,
  MODEL_CLASSIFICATIONS.VECTOR,
  MODEL_CLASSIFICATIONS.REALTIME,
]

export function getModelClassificationLabels(
  t: TFunction
): Record<ModelClassificationId, string> {
  return {
    [MODEL_CLASSIFICATIONS.ALL]: t('All Classifications'),
    [MODEL_CLASSIFICATIONS.OMNIMODAL]: t('Omnimodal'),
    [MODEL_CLASSIFICATIONS.TEXT]: t('Text'),
    [MODEL_CLASSIFICATIONS.VISION]: t('Vision'),
    [MODEL_CLASSIFICATIONS.AUDIO]: t('Audio'),
    [MODEL_CLASSIFICATIONS.VECTOR]: t('Vectors'),
    [MODEL_CLASSIFICATIONS.REALTIME]: t('Realtime'),
  }
}

export function listModelClassifications(): ModelClassificationId[] {
  return CLASSIFICATION_ORDER
}

function hasEndpoint(model: PricingModel, endpoint: string): boolean {
  return model.supported_endpoint_types?.includes(endpoint) ?? false
}

function isVisionGenerationModel(name: string): boolean {
  const normalized = name.replace(/\s+/g, '-')
  return (
    /nano-banana|dall-?e|imagen|flux|midjourney|stable-diffusion|ideogram|gpt-image|seedream|recraft|cogview/.test(
      normalized
    ) ||
    /sora|veo|kling|pika|video|wan-|hunyuanvideo|seedance|cogvideo|vidu|jimeng|hailuo|t2v|i2v/.test(
      normalized
    )
  )
}

function isOmnimodalModel(name: string, tags: string[]): boolean {
  if (/grok/.test(name)) {
    return true
  }
  if (
    /gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5|gpt-6|\bo[134](?:-|$)|chatgpt/.test(
      name
    )
  ) {
    return true
  }
  if (/claude|sonnet|opus|haiku|fable|anthropic/.test(name)) {
    return true
  }
  if (/gemini|gemma|learnlm/.test(name) && !/nano-banana/.test(name)) {
    return true
  }
  if (/nova|pixtral|magistral|qwen-vl|qvq|glm-4v|cogvlm|llava|internvl|minicpm-v/.test(name)) {
    return true
  }
  if (
    tags.some((tag) => ['multimodal', 'vision', 'omnimodal'].includes(tag))
  ) {
    return true
  }
  return false
}

function isTextModel(name: string): boolean {
  return /devstral|codestral/.test(name)
}

export function getModelClassification(
  model: PricingModel
): ModelClassificationId {
  const name = model.model_name.toLowerCase()
  const tags = parseTags(model.tags).map((tag) => tag.toLowerCase())

  if (/realtime/.test(name)) {
    return MODEL_CLASSIFICATIONS.REALTIME
  }

  if (
    hasEndpoint(model, ENDPOINT_TYPES.EMBEDDINGS) ||
    hasEndpoint(model, ENDPOINT_TYPES.JINA_RERANK) ||
    /embed|rerank|bge-|e5-|voyage-|gte-/.test(name)
  ) {
    return MODEL_CLASSIFICATIONS.VECTOR
  }

  if (
    hasEndpoint(model, ENDPOINT_TYPES.IMAGE_GENERATION) ||
    hasEndpoint(model, ENDPOINT_TYPES.OPENAI_VIDEO) ||
    isVisionGenerationModel(name)
  ) {
    return MODEL_CLASSIFICATIONS.VISION
  }

  if (/whisper|tts|voice|audio|speech|suno/.test(name)) {
    return MODEL_CLASSIFICATIONS.AUDIO
  }

  if (hasTaskUsageSchema(model)) {
    return MODEL_CLASSIFICATIONS.VISION
  }

  if (isTextModel(name)) {
    return MODEL_CLASSIFICATIONS.TEXT
  }

  if (isOmnimodalModel(name, tags)) {
    return MODEL_CLASSIFICATIONS.OMNIMODAL
  }

  if (
    (hasEndpoint(model, ENDPOINT_TYPES.ANTHROPIC) ||
      hasEndpoint(model, ENDPOINT_TYPES.GEMINI)) &&
    !isVisionGenerationModel(name)
  ) {
    return MODEL_CLASSIFICATIONS.OMNIMODAL
  }

  if (
    hasEndpoint(model, ENDPOINT_TYPES.OPENAI) ||
    hasEndpoint(model, ENDPOINT_TYPES.OPENAI_RESPONSE)
  ) {
    return MODEL_CLASSIFICATIONS.OMNIMODAL
  }

  return MODEL_CLASSIFICATIONS.TEXT
}

export function matchesModelClassification(
  model: PricingModel,
  classification: string
): boolean {
  if (classification === MODEL_CLASSIFICATIONS.ALL) return true
  return getModelClassification(model) === classification
}
