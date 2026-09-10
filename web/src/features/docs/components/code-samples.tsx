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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeBlock,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPublicApiBaseUrl, getPublicOpenAIBaseUrl } from '@/lib/product'

type SampleName = 'openai' | 'responses' | 'claude' | 'gemini'

const SAMPLE_LANGUAGES: Record<SampleName, string> = {
  openai: 'python',
  responses: 'bash',
  claude: 'bash',
  gemini: 'bash',
}

function buildSamples(): Record<SampleName, string> {
  const origin = getPublicApiBaseUrl().replace(/\/+$/, '')
  const openAIBaseUrl = getPublicOpenAIBaseUrl()

  return {
    openai: `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["AIHUB_API_KEY"],
    base_url="${openAIBaseUrl}",
)

response = client.chat.completions.create(
    model="your-model",
    messages=[{"role": "user", "content": "Hello"}],
)

print(response.choices[0].message.content)`,
    responses: `curl "${openAIBaseUrl}/responses" \\
  -H "Authorization: Bearer ${'$'}AIHUB_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "your-model",
    "input": "Hello"
  }'`,
    claude: `curl "${openAIBaseUrl}/messages" \\
  -H "x-api-key: ${'$'}AIHUB_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "your-model",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
    gemini: `curl "${origin}/v1beta/models/your-model:generateContent" \\
  -H "x-goog-api-key: ${'$'}AIHUB_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}]
  }'`,
  }
}

export function CodeSamples() {
  const { t } = useTranslation()
  const [sample, setSample] = useState<SampleName>('openai')
  const samples = buildSamples()

  return (
    <div className='flex flex-col gap-3'>
      <Tabs
        value={sample}
        onValueChange={(value) => setSample(value as SampleName)}
      >
        <TabsList variant='line' className='max-w-full overflow-x-auto'>
          <TabsTrigger value='openai'>OpenAI SDK</TabsTrigger>
          <TabsTrigger value='responses'>Responses</TabsTrigger>
          <TabsTrigger value='claude'>Claude</TabsTrigger>
          <TabsTrigger value='gemini'>Gemini</TabsTrigger>
        </TabsList>
      </Tabs>
      <CodeBlock
        code={samples[sample]}
        language={SAMPLE_LANGUAGES[sample]}
        title={t('Request example')}
      >
        <CodeBlockCopyButton />
      </CodeBlock>
      <p className='text-muted-foreground text-xs'>
        {t(
          'Replace your-model with a model returned by GET /v1/models or shown in Model Square.'
        )}
      </p>
    </div>
  )
}
