import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
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
import { act, createElement } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import ja from '@/i18n/locales/ja.json'
import ru from '@/i18n/locales/ru.json'
import vi from '@/i18n/locales/vi.json'
import zhTW from '@/i18n/locales/zh-TW.json'
import zhCN from '@/i18n/locales/zh.json'

import { CodeSamples } from '../components/code-samples'
import { EndpointGroup } from '../components/endpoint-group'
import {
  AI_API_GROUPS,
  DOCS_DIRECTORIES,
  DOCS_STATIC_TRANSLATION_KEYS,
  MANAGEMENT_API_GROUPS,
} from '../docs-data'

const DOCS_LOCALES = { en, zhCN, zhTW, fr, ja, ru, vi }

describe('API documentation catalog', () => {
  it('exposes the three documented directories', () => {
    expect(DOCS_DIRECTORIES.map((directory) => directory.id)).toEqual([
      'api-reference',
      'ai-model-apis',
      'management-apis',
    ])
  })

  it('ships every documentation catalog string in every supported locale', () => {
    for (const [language, resource] of Object.entries(DOCS_LOCALES)) {
      const missingKeys = DOCS_STATIC_TRANSLATION_KEYS.filter(
        (key) => !Object.hasOwn(resource.translation, key)
      )

      expect(missingKeys, `${language} is missing documentation copy`).toEqual(
        []
      )
    }
  })

  it('provides localized documentation copy instead of fallback English', () => {
    expect(zhCN.translation['AIHub API Reference']).toBe('AIHub API 参考')
    expect(zhTW.translation['AIHub API Reference']).toBe('AIHub API 參考')
    expect(fr.translation['AIHub API Reference']).toBe('Référence API AIHub')
    expect(ja.translation['AIHub API Reference']).toBe('AIHub API リファレンス')
    expect(ru.translation['AIHub API Reference']).toBe('Справочник API AIHub')
    expect(vi.translation['AIHub API Reference']).toBe('Tham chiếu API AIHub')
  })

  it('rerenders documentation content when the active language changes', async () => {
    const docsI18n = createInstance()
    await docsI18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en, zhCN },
    })

    render(
      createElement(
        I18nextProvider,
        { i18n: docsI18n },
        createElement(EndpointGroup, { group: AI_API_GROUPS[0] })
      )
    )
    expect(screen.getByText('Model list')).toBeInTheDocument()

    await act(() => docsI18n.changeLanguage('zhCN'))

    expect(screen.getByText('模型列表')).toBeInTheDocument()
    expect(screen.queryByText('Model list')).not.toBeInTheDocument()
  })

  it('does not duplicate a method and path within one catalog', () => {
    for (const groups of [AI_API_GROUPS, MANAGEMENT_API_GROUPS]) {
      const routes = groups.flatMap((group) =>
        group.endpoints.map((endpoint) =>
          [endpoint.method, endpoint.path].join(' ')
        )
      )
      expect(new Set(routes).size).toBe(routes.length)
    }
  })

  it('includes the primary supported AI protocols', () => {
    const routes = new Set(
      AI_API_GROUPS.flatMap((group) =>
        group.endpoints.map((endpoint) =>
          [endpoint.method, endpoint.path].join(' ')
        )
      )
    )

    expect([...routes]).toEqual(
      expect.arrayContaining([
        'GET /v1/models',
        'POST /v1/chat/completions',
        'POST /v1/responses',
        'POST /v1/messages',
        'POST /v1beta/models/{model}:generateContent',
        'POST /v1/models/{model}:streamGenerateContent',
        'POST /v1beta/models/{model}:embedContent',
        'POST /v1/embeddings',
        'POST /v1/images/generations',
        'POST /v1/audio/speech',
      ])
    )
  })

  it('matches source-verified conditional and wildcard route behavior', () => {
    const responses = AI_API_GROUPS.find((group) => group.id === 'responses')
    const embeddings = AI_API_GROUPS.find((group) => group.id === 'embeddings')
    const tasks = AI_API_GROUPS.find((group) => group.id === 'tasks')
    const realtime = AI_API_GROUPS.find((group) => group.id === 'realtime')

    expect(
      responses?.endpoints.find(
        (endpoint) => endpoint.path === '/v1/responses/:response_id'
      )?.status
    ).toBe('conditional')
    expect(
      embeddings?.endpoints.find(
        (endpoint) => endpoint.path === '/v1/engines/:model/embeddings'
      )?.status
    ).toBe('conditional')
    expect(tasks?.endpoints.map((endpoint) => endpoint.path)).toEqual([
      '/v1/tasks/:key',
      '/v1/tasks/:key',
      '/v1/tasks/:key/artifacts',
      '/v1/tasks/:key/artifacts/:artifact_key/content',
      '/v1/tasks/:key/artifacts/:artifact_key/content',
    ])
    expect(realtime?.descriptionKey).toContain('openai-insecure-api-key')
  })

  it('reads the OpenAI SDK key from the process environment', () => {
    render(createElement(CodeSamples))

    expect(document.body.textContent).toContain(
      'api_key=os.environ["AIHUB_API_KEY"]'
    )
    expect(document.body.textContent).not.toContain('api_key="$AIHUB_API_KEY"')
  })

  it('labels placeholder routes as unimplemented', () => {
    const placeholders = AI_API_GROUPS.find(
      (group) => group.id === 'unimplemented'
    )

    expect(placeholders?.endpoints.length).toBeGreaterThan(0)
    expect(
      placeholders?.endpoints.every(
        (endpoint) => endpoint.status === 'unimplemented'
      )
    ).toBe(true)
  })

  it('keeps relay keys separate from dashboard authentication', () => {
    const keyManagement = MANAGEMENT_API_GROUPS.find(
      (group) => group.id === 'tokens'
    )
    const accountSecurity = MANAGEMENT_API_GROUPS.find(
      (group) => group.id === 'account-security'
    )

    expect(
      keyManagement?.endpoints.some(
        (endpoint) => endpoint.path === '/api/token/'
      )
    ).toBe(true)
    expect(
      accountSecurity?.endpoints.some(
        (endpoint) => endpoint.path === '/api/user/token'
      )
    ).toBe(true)
  })
})
