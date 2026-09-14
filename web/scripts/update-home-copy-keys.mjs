import fs from 'node:fs/promises'
import path from 'node:path'

const LOCALES_DIR = path.resolve('src/i18n/locales')
const LOCALES = ['en', 'zh', 'zh-TW', 'fr', 'ja', 'ru', 'vi']

const keyUpdates = {
  en: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.',
  },
  zh: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      '等官方 AI 模型。官方直供源，全球多节点，模型集中管理，兼容 OpenAI API、Claude Messages 等轻松接入现有应用。',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      '通过一个 API，统一调用 ChatGPT、Claude、Gemini、Grok 等官方 AI 模型。官网渠道直连，保障模型质量与调用稳定；全球多节点加速，兼顾安全与响应速度，并兼容 OpenAI API、Claude Messages，现有应用可快速接入。',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      '统一调用 GPT、Claude、Gemini、Grok 等官方 AI 模型。',
  },
  'zh-TW': {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      '等官方 AI 模型。官方直供源，全球多節點，模型集中管理，相容 OpenAI API、Claude Messages 等輕鬆接入現有應用。',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      '透過一個 API，統一呼叫 ChatGPT、Claude、Gemini、Grok 等官方 AI 模型。官網渠道直連，保障模型品質與呼叫穩定；全球多節點加速，兼顧安全與回應速度，並相容 OpenAI API、Claude Messages，現有應用可快速接入。',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      '統一呼叫 GPT、Claude、Gemini、Grok 等官方 AI 模型。',
  },
  fr: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      'et d\'autres modèles d\'IA officiels. Source officielle, nœuds mondiaux et modèles centralisés. Compatible avec l\'API OpenAI et Claude Messages pour brancher vos applications existantes.',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      'Appelez ChatGPT, Claude, Gemini, Grok et d\'autres modèles d\'IA officiels via une seule API. Les canaux officiels préservent qualité et stabilité ; les nœuds mondiaux accélèrent en sécurité. Compatible avec l\'API OpenAI et Claude Messages pour connecter vos applications existantes.',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      'Appelez GPT, Claude, Gemini, Grok et d\'autres modèles d\'IA officiels via une seule interface.',
  },
  ja: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      'など公式 AI モデル。公式ソース、グローバルノード、モデルの集中管理。OpenAI API と Claude Messages に対応し、既存アプリへ簡単に接続できます。',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      'ひとつの API で ChatGPT、Claude、Gemini、Grok など公式 AI モデルを統一呼び出し。公式チャネル直結で品質と安定性を守り、グローバル多ノードで安全と応答速度を両立。OpenAI API と Claude Messages に対応し、既存アプリへ素早く接続できます。',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      'GPT、Claude、Gemini、Grok など公式 AI モデルをひとつのインターフェースで呼び出します。',
  },
  ru: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      'и другие официальные модели ИИ. Официальный источник, глобальные узлы и централизованные модели. Совместимо с OpenAI API и Claude Messages — легко встроить в существующие приложения.',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      'Вызывайте ChatGPT, Claude, Gemini, Grok и другие официальные модели ИИ через один API. Официальные каналы сохраняют качество и стабильность; глобальные узлы ускоряют работу без потери безопасности. Совместимо с OpenAI API и Claude Messages — существующие приложения подключаются быстро.',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      'Вызывайте GPT, Claude, Gemini, Grok и другие официальные модели ИИ через один интерфейс.',
  },
  vi: {
    'and other official AI models. Official source, global nodes, and centralized models. Compatible with the OpenAI API and Claude Messages so you can plug into existing apps.':
      'và các mô hình AI chính thức khác. Nguồn chính thức, nhiều nút toàn cầu, quản lý mô hình tập trung. Tương thích OpenAI API và Claude Messages để gắn vào ứng dụng hiện có.',
    'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.':
      'Gọi ChatGPT, Claude, Gemini, Grok và các mô hình AI chính thức khác qua một API. Kênh chính thức bảo đảm chất lượng và ổn định; nhiều nút toàn cầu tăng tốc an toàn. Tương thích OpenAI API và Claude Messages, ứng dụng hiện có có thể kết nối nhanh.',
    'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.':
      'Gọi GPT, Claude, Gemini, Grok và các mô hình AI chính thức khác qua một giao diện.',
  },
}

function stableStringify(obj) {
  return JSON.stringify(obj, null, 2) + '\n'
}

for (const locale of LOCALES) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`)
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  const translation = parsed.translation ?? parsed

  for (const [key, value] of Object.entries(keyUpdates[locale])) {
    translation[key] = value
  }

  const sorted = Object.fromEntries(
    Object.entries(translation).sort(([a], [b]) => a.localeCompare(b))
  )

  await fs.writeFile(
    filePath,
    stableStringify({ translation: sorted }),
    'utf8'
  )
  console.log(`Updated ${locale}.json`)
}
